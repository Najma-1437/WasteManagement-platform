const pool = require('../config/db');
const { normalizePhone } = require('./auth.controller');
const smsService = require('../services/sms.service');

const CAT_MAP   = { '1': 'organic', '2': 'plastic', '3': 'metal', '4': 'e-waste' };
const CAT_LABEL = { '1': 'Organic', '2': 'Plastic', '3': 'Metal',  '4': 'E-waste' };

async function lookupCollector(phone) {
  const result = await pool.query(
    `SELECT u.user_id, u.status, c.collector_id
     FROM users u
     JOIN collectors c ON c.user_id = u.user_id
     WHERE u.phone_number = $1 AND u.role = 'collector'`,
    [phone]
  );
  return result.rows[0] || null;
}

/*
 * parseFullFlow — multi-cycle state machine for the "1. Log Collection" sub-flow.
 *
 * parts[0] === '1' (guaranteed by caller). Processes all tokens after '1' as a
 * sequence of log cycles. Each cycle: catDigit → (weight attempts) → validWeight
 * → confirm(1/2). After a confirmed log the session shows "1. Log Another / 2. Exit".
 * "Log Another" (1) resets catIdx/weight and starts a new cycle; "Exit" (2) ends.
 *
 * Returns: { step, catIdx, weight, invalid }
 *   step values:
 *     'select_category' — show (or re-show) category menu
 *     'enter_weight'    — show (or re-show) weight prompt
 *     'confirm_weight'  — show (or re-show) confirm/cancel menu
 *     'do_insert'       — execute INSERT then return CON "log another/exit" menu
 *     'after_log'       — re-show "log another/exit" (invalid choice was sent)
 *     'cancelled'       — END, user cancelled the current log
 *     'exit'            — END, user chose exit from the after-log menu
 *   invalid: true when the last token was unrecognized for the current step.
 * Returns null for genuinely malformed state (tokens after a terminal choice).
 *
 * EXAMPLES — accumulated text strings and expected server response:
 *
 * (a) Two-log session then exit  ("1*2*5.5*1*1*3*2.0*1*2"):
 *   ""               → CON main menu (step 0)
 *   "1"              → CON "Select category:..."  (main menu branch, len=1)
 *   "1*2"            → CON "Enter weight in kg (e.g. 5.5):"
 *   "1*2*5.5"        → CON "Confirm: 5.5kg Plastic.\n1. Confirm\n2. Cancel"
 *   "1*2*5.5*1"      → do_insert 5.5kg plastic → CON "Logged: 5.5kg Plastic. Ref #N.\n1. Log Another\n2. Exit"
 *   "1*2*5.5*1*1"    → CON "Select category:\n1. Organic\n2. Plastic\n3. Metal\n4. E-waste"
 *   "1*2*5.5*1*1*3"  → CON "Enter weight in kg (e.g. 5.5):"
 *   "1*2*5.5*1*1*3*2.0"   → CON "Confirm: 2kg Metal.\n1. Confirm\n2. Cancel"
 *   "1*2*5.5*1*1*3*2.0*1" → do_insert 2kg metal → CON "Logged: 2kg Metal. Ref #N.\n1. Log Another\n2. Exit"
 *   "1*2*5.5*1*1*3*2.0*1*2" → END "Goodbye. Thank you for using WasteManagement."
 *
 * (b) Invalid category corrected, then exit  ("1*5*2*5.5*1*2"):
 *   "1*5"       → CON "Invalid choice. Select category:..."
 *   "1*5*2"     → CON "Enter weight in kg (e.g. 5.5):"
 *   "1*5*2*5.5" → CON "Confirm: 5.5kg Plastic.\n1. Confirm\n2. Cancel"
 *   "1*5*2*5.5*1" → do_insert 5.5kg plastic → CON "Logged: 5.5kg Plastic. Ref #N.\n1. Log Another\n2. Exit"
 *   "1*5*2*5.5*1*2" → END "Goodbye. Thank you for using WasteManagement."
 *
 * (c) Invalid weight corrected, then exit  ("1*3*abc*5.0*1*2"):
 *   "1*3"         → CON "Enter weight in kg (e.g. 5.5):"
 *   "1*3*abc"     → CON "Invalid weight. Enter weight in kg (e.g. 5.5):"
 *   "1*3*abc*5.0" → CON "Confirm: 5kg Metal.\n1. Confirm\n2. Cancel"
 *   "1*3*abc*5.0*1" → do_insert 5kg metal → CON "Logged: 5kg Metal. Ref #N.\n1. Log Another\n2. Exit"
 *   "1*3*abc*5.0*1*2" → END "Goodbye. Thank you for using WasteManagement."
 */
function parseFullFlow(parts) {
  const tokens = parts.slice(1);

  if (tokens.length === 0) return { step: 'select_category', invalid: false };

  let state  = 'select_category';
  let catIdx = null;
  let weight = null;
  let invalid = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok    = tokens[i];
    const isLast = (i === tokens.length - 1);

    if (state === 'select_category') {
      if (CAT_MAP[tok]) {
        catIdx  = tok;
        state   = 'enter_weight';
        invalid = false;
      } else {
        invalid = true;
      }

    } else if (state === 'enter_weight') {
      const w = parseFloat(tok);
      if (w > 0 && isFinite(w)) {
        weight  = w;
        state   = 'confirm_weight';
        invalid = false;
      } else {
        invalid = true;
      }

    } else if (state === 'confirm_weight') {
      if (tok === '1') {
        if (isLast) return { step: 'do_insert', catIdx, weight, invalid: false };
        state   = 'after_log';
        invalid = false;
      } else if (tok === '2') {
        if (!isLast) return null; // tokens after cancel = malformed
        return { step: 'cancelled', catIdx, weight, invalid: false };
      } else {
        invalid = true;
      }

    } else if (state === 'after_log') {
      if (tok === '1') {
        catIdx  = null;
        weight  = null;
        state   = 'select_category';
        invalid = false;
      } else if (tok === '2') {
        if (!isLast) return null; // tokens after exit = malformed
        return { step: 'exit', invalid: false };
      } else {
        invalid = true;
      }
    }
  }

  return { step: state, catIdx, weight, invalid };
}

exports.handleUssd = async (req, res) => {
  const respond = (msg) => {
    res.set('Content-Type', 'text/plain');
    res.send(msg);
  };

  try {
    const { phoneNumber, text } = req.body;
    const phone = normalizePhone(phoneNumber || '');
    const parts = (text || '').split('*');

    // ── STEP 0: first dial ──────────────────────────────────────────────────
    if (text === '') {
      const collector = await lookupCollector(phone);
      if (!collector) {
        return respond('END Number not registered as a collector. Register on the WasteManagement web app first.');
      }
      if (collector.status === 'pending') {
        return respond('END Your account is awaiting approval. Please try again later.');
      }
      if (collector.status === 'suspended') {
        return respond('END Your account has been suspended. Contact support.');
      }
      return respond('CON Welcome to WasteManagement\n1. Log Collection\n2. Check Last Log Status\n3. Exit');
    }

    // ── STEP 1: main menu selection ─────────────────────────────────────────
    if (parts.length === 1) {
      if (parts[0] === '1') {
        return respond('CON Select category:\n1. Organic\n2. Plastic\n3. Metal\n4. E-waste');
      }
      if (parts[0] === '2') {
        const collector = await lookupCollector(phone);
        if (!collector) return respond('END Session expired. Dial again.');
        const result = await pool.query(
          `SELECT category, weight_kg, status
           FROM waste_logs WHERE collector_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [collector.collector_id]
        );
        if (result.rows.length === 0) return respond('END No collection logs found.');
        const log = result.rows[0];
        return respond(`END Last log: ${log.weight_kg}kg ${log.category}, status: ${log.status}.`);
      }
      if (parts[0] === '3') {
        return respond('END Goodbye.');
      }
      // Invalid main menu choice — re-prompt instead of ending the session
      return respond('CON Invalid choice. Welcome to WasteManagement\n1. Log Collection\n2. Check Last Log Status\n3. Exit');
    }

    // ── Log Collection sub-flow (parts[0] === '1', depth >= 2) ─────────────
    if (parts[0] !== '1') return respond('END Session error. Please dial again.');

    const state = parseFullFlow(parts);
    if (!state) return respond('END Session error. Please dial again.');

    if (state.step === 'select_category') {
      const prefix = state.invalid ? 'Invalid choice. ' : '';
      return respond(`CON ${prefix}Select category:\n1. Organic\n2. Plastic\n3. Metal\n4. E-waste`);
    }

    if (state.step === 'enter_weight') {
      const prefix = state.invalid ? 'Invalid weight. ' : '';
      return respond(`CON ${prefix}Enter weight in kg (e.g. 5.5):`);
    }

    if (state.step === 'confirm_weight') {
      const prefix = state.invalid ? 'Invalid choice. ' : '';
      return respond(`CON ${prefix}Confirm: ${state.weight}kg ${CAT_LABEL[state.catIdx]}.\n1. Confirm\n2. Cancel`);
    }

    if (state.step === 'after_log') {
      const prefix = state.invalid ? 'Invalid choice. ' : '';
      return respond(`CON ${prefix}1. Log Another\n2. Exit`);
    }

    if (state.step === 'cancelled') {
      return respond('END Cancelled. Dial again to log a collection.');
    }

    if (state.step === 'exit') {
      return respond('END Goodbye. Thank you for using WasteManagement.');
    }

    if (state.step === 'do_insert') {
      const collector = await lookupCollector(phone);
      if (!collector) return respond('END Session expired. Dial again.');

      const result = await pool.query(
        `INSERT INTO waste_logs (collector_id, category, weight_kg, status, source)
         VALUES ($1, $2, $3, 'pending', 'ussd')
         RETURNING log_id`,
        [collector.collector_id, CAT_MAP[state.catIdx], state.weight]
      );
      const { log_id } = result.rows[0];

      try {
        smsService.sendSms(
          phone,
          `WasteManagement: Logged ${state.weight}kg ${CAT_LABEL[state.catIdx]}, Ref #${log_id}, status: pending.`
        );
      } catch (e) {
        console.error('[USSD] SMS fire-and-forget error:', e);
      }

      return respond(`CON Logged: ${state.weight}kg ${CAT_LABEL[state.catIdx]}. Ref #${log_id}.\n1. Log Another\n2. Exit`);
    }

    return respond('END Session error. Please dial again.');

  } catch (err) {
    console.error('[USSD] Unhandled error:', err);
    res.set('Content-Type', 'text/plain');
    res.send('END Service temporarily unavailable. Please try again.');
  }
};
