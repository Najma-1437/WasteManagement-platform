const pool = require('../config/db');
const smsService = require('../services/sms.service');
const { fetch: undiciFetch, Agent } = require('undici');

// Daraja sits behind the Imperva WAF; TLS setup intermittently takes 5-10s+,
// which trips undici's default 10s connect timeout (UND_ERR_CONNECT_TIMEOUT).
// Allow 15s to connect and retry once immediately — a connect timeout means
// the request never reached Safaricom, so retrying cannot double-send.
// The retry gets a tighter 5s budget so the user-facing worst case stays ~20s.
const darajaAgent = new Agent({ connectTimeout: 15000 });
const darajaRetryAgent = new Agent({ connectTimeout: 5000 });

async function darajaFetch(url, options) {
  try {
    return await undiciFetch(url, { ...options, dispatcher: darajaAgent });
  } catch (err) {
    if (err.cause?.code !== 'UND_ERR_CONNECT_TIMEOUT') throw err;
    return undiciFetch(url, { ...options, dispatcher: darajaRetryAgent });
  }
}

// Helper: resolve buyer_id from the authenticated user_id
async function getBuyerId(userId) {
  const result = await pool.query(
    'SELECT buyer_id FROM buyers WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw { status: 404, message: 'Buyer profile not found for this account' };
  }
  return result.rows[0].buyer_id;
}

// GET /api/buyer/offers — list this buyer's posted offers
exports.getMyOffers = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const result = await pool.query(
      `SELECT offer_id, category, price_per_kg, min_quantity_kg,
              zone, status, created_at
       FROM buyer_offers
       WHERE buyer_id = $1
       ORDER BY created_at DESC`,
      [buyerId]
    );
    res.json({ offers: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/buyer/offers — create a new offer (with optional location pin)
exports.createOffer = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const { category, price_per_kg, min_quantity_kg, zone, latitude, longitude } = req.body;

    if (!category || !price_per_kg || !zone) {
      return res.status(400).json({ error: 'category, price_per_kg, and zone are required' });
    }

    const hasLocation = latitude != null && longitude != null;
    const params = [buyerId, category, price_per_kg, min_quantity_kg || 0, zone];

    if (hasLocation) params.push(longitude, latitude);

    const result = await pool.query(
      hasLocation
        ? `INSERT INTO buyer_offers
             (buyer_id, category, price_per_kg, min_quantity_kg, zone, location, status)
           VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, 'active')
           RETURNING offer_id, category, price_per_kg, min_quantity_kg, zone, status, created_at`
        : `INSERT INTO buyer_offers
             (buyer_id, category, price_per_kg, min_quantity_kg, zone, status)
           VALUES ($1, $2, $3, $4, $5, 'active')
           RETURNING offer_id, category, price_per_kg, min_quantity_kg, zone, status, created_at`,
      params
    );

    res.status(201).json({ offer: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/buyer/offers/:offerId — update price/status/etc, ownership enforced
exports.updateOffer = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const { offerId } = req.params;
    const { price_per_kg, min_quantity_kg, status } = req.body;

    const result = await pool.query(
      `UPDATE buyer_offers
       SET price_per_kg = COALESCE($1, price_per_kg),
           min_quantity_kg = COALESCE($2, min_quantity_kg),
           status = COALESCE($3, status)
       WHERE offer_id = $4 AND buyer_id = $5
       RETURNING offer_id, category, price_per_kg, min_quantity_kg, zone, status`,
      [price_per_kg, min_quantity_kg, status, offerId, buyerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found or not owned by this buyer' });
    }
    res.json({ offer: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/buyer/offers/:offerId
exports.deleteOffer = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const { offerId } = req.params;

    const result = await pool.query(
      'DELETE FROM buyer_offers WHERE offer_id = $1 AND buyer_id = $2 RETURNING offer_id',
      [offerId, buyerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found or not owned by this buyer' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// GET /api/buyer/matches — waste logs matching this buyer's active offers
exports.getMatches = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);

    // Check whether the location column exists yet (migration 002 may not have run)
    const colCheck = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'buyer_offers' AND column_name = 'location'`
    );
    const hasLocationCol = colCheck.rows.length > 0;

    const result = await pool.query(
      hasLocationCol
        ? `SELECT
             wl.log_id, wl.category, wl.weight_kg, wl.created_at AS logged_at,
             c.collector_id,
             u.name         AS collector_name,
             u.phone_number AS collector_phone,
             bo.offer_id, bo.price_per_kg,
             CASE
               WHEN bo.location IS NOT NULL AND wl.location IS NOT NULL
                 THEN ROUND((ST_Distance(bo.location, wl.location) / 1000)::numeric, 2)
               ELSE NULL
             END AS distance_km
           FROM buyer_offers bo
           JOIN waste_logs wl
             ON wl.category = bo.category
            AND wl.status = 'pending'
            AND wl.weight_kg >= bo.min_quantity_kg
           JOIN collectors c ON c.collector_id = wl.collector_id
           JOIN users u ON u.user_id = c.user_id
           WHERE bo.buyer_id = $1 AND bo.status = 'active'
           ORDER BY
             CASE WHEN bo.location IS NOT NULL AND wl.location IS NOT NULL
                  THEN ST_Distance(bo.location, wl.location) ELSE 999999999 END ASC,
             wl.created_at DESC
           LIMIT 50`
        : `SELECT
             wl.log_id, wl.category, wl.weight_kg, wl.created_at AS logged_at,
             c.collector_id,
             u.name         AS collector_name,
             u.phone_number AS collector_phone,
             bo.offer_id, bo.price_per_kg,
             NULL::numeric  AS distance_km
           FROM buyer_offers bo
           JOIN waste_logs wl
             ON wl.category = bo.category
            AND wl.status = 'pending'
            AND wl.weight_kg >= bo.min_quantity_kg
           JOIN collectors c ON c.collector_id = wl.collector_id
           JOIN users u ON u.user_id = c.user_id
           WHERE bo.buyer_id = $1 AND bo.status = 'active'
           ORDER BY wl.created_at DESC
           LIMIT 50`,
      [buyerId]
    );

    res.json({ matches: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/buyer/transactions — this buyer's transaction history
exports.getMyTransactions = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const result = await pool.query(
      `SELECT t.transaction_id,
              t.amount_kes       AS amount,
              t.payment_status   AS status,
              t.mpesa_code       AS mpesa_receipt,
              t.payout_error,
              t.transaction_date AS created_at,
              wl.category, wl.weight_kg,
              u.name AS collector_name
       FROM transactions t
       JOIN waste_logs wl ON wl.log_id = t.log_id
       JOIN collectors c  ON c.collector_id = wl.collector_id
       JOIN users u       ON u.user_id = c.user_id
       WHERE t.buyer_id = $1
       ORDER BY t.transaction_date DESC
       LIMIT 50`,
      [buyerId]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    next(err);
  }
};
// PATCH /api/buyer/matches/:logId/confirm — claim a log, create a pending transaction
exports.confirmMatch = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const { logId } = req.params;
    const { offer_id } = req.body;

    if (!offer_id) {
      return res.status(400).json({ error: 'offer_id is required' });
    }

    // Ownership check + get price_per_kg
    const offerCheck = await pool.query(
      'SELECT price_per_kg FROM buyer_offers WHERE offer_id = $1 AND buyer_id = $2',
      [offer_id, buyerId]
    );
    if (offerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Offer not found or not owned by this buyer' });
    }
    const pricePerKg = parseFloat(offerCheck.rows[0].price_per_kg);

    // Optimistic lock: only succeeds if log is still pending
    const logResult = await pool.query(
      `UPDATE waste_logs
       SET status = 'matched', matched_buyer_id = $2, matched_offer_id = $3
       WHERE log_id = $1 AND status = 'pending'
       RETURNING log_id, weight_kg, status`,
      [logId, buyerId, offer_id]
    );

    if (logResult.rows.length === 0) {
      return res.status(409).json({ error: 'This log has already been claimed by another buyer' });
    }

    const weightKg = parseFloat(logResult.rows[0].weight_kg);
    const amountKes = (weightKg * pricePerKg).toFixed(2);

    // Notify collector via SMS + in-app (fire-and-forget; never blocks or throws)
    try {
      const collectorInfo = await pool.query(
        `SELECT u.phone_number, u.user_id, wl.category
         FROM waste_logs wl
         JOIN collectors c ON c.collector_id = wl.collector_id
         JOIN users u ON u.user_id = c.user_id
         WHERE wl.log_id = $1`,
        [logId]
      );
      if (collectorInfo.rows.length > 0) {
        const { phone_number, user_id, category } = collectorInfo.rows[0];
        const msg = `Your ${weightKg}kg ${category} log has been matched with a buyer.`;
        smsService.sendSms(
          phone_number,
          `WasteManagement: ${msg} Check the app for details.`
        );
        pool.query(
          `INSERT INTO notifications (user_id, channel, message) VALUES ($1, 'in-app', $2)`,
          [user_id, msg]
        ).catch(err => console.error('[confirmMatch] in-app notification error:', err));
      }
    } catch (smsErr) {
      console.error('[confirmMatch] SMS notification error:', smsErr);
    }

    // Create a pending transaction
    const txResult = await pool.query(
      `INSERT INTO transactions (log_id, buyer_id, confirmed_qty_kg, amount_kes)
       VALUES ($1, $2, $3, $4)
       RETURNING transaction_id, confirmed_qty_kg AS weight_kg,
                 amount_kes AS amount, payment_status AS status,
                 mpesa_code AS mpesa_receipt, transaction_date AS created_at`,
      [logId, buyerId, weightKg, amountKes]
    );

    res.json({ log: logResult.rows[0], transaction: txResult.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── M-Pesa helpers ────────────────────────────────────────────────────────────

async function getMpesaToken() {
  const host = process.env.MPESA_ENVIRONMENT === 'production'
    ? 'api.safaricom.co.ke'
    : 'sandbox.safaricom.co.ke';
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');
  const res = await fetch(
    `https://${host}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!res.ok) throw new Error('Failed to get M-Pesa OAuth token');
  const data = await res.json();
  return data.access_token;
}

// POST /api/buyer/transactions/:transactionId/pay — initiate Safaricom STK Push
exports.initiatePayment = async (req, res, next) => {
  try {
    if (!process.env.MPESA_CONSUMER_KEY) {
      return res.status(501).json({
        error: 'M-Pesa not configured. Add MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL to server/.env',
      });
    }

    const buyerId = await getBuyerId(req.user.user_id);
    const { transactionId } = req.params;
    let { phone_number } = req.body;

    const txResult = await pool.query(
      `SELECT t.transaction_id, t.amount_kes, t.payment_status, t.confirmed_qty_kg,
              wl.category
       FROM transactions t
       JOIN waste_logs wl ON wl.log_id = t.log_id
       WHERE t.transaction_id = $1 AND t.buyer_id = $2`,
      [transactionId, buyerId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const tx = txResult.rows[0];
    if (tx.payment_status !== 'pending') {
      return res.status(400).json({ error: `Transaction is already ${tx.payment_status}` });
    }

    // Normalize to 254XXXXXXXXX
    phone_number = String(phone_number || '').replace(/\s+/g, '');
    if (!phone_number) return res.status(400).json({ error: 'phone_number is required' });
    if (phone_number.startsWith('0'))  phone_number = '254' + phone_number.slice(1);
    if (phone_number.startsWith('+'))  phone_number = phone_number.slice(1);

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey   = process.env.MPESA_PASSKEY;
    const host      = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'api.safaricom.co.ke'
      : 'sandbox.safaricom.co.ke';
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const amount    = Math.ceil(parseFloat(tx.amount_kes));

    const token = await getMpesaToken();

    const stkRes = await darajaFetch(`https://${host}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone_number,
        PartyB: shortcode,
        PhoneNumber: phone_number,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: `WM-TX-${transactionId}`,
        TransactionDesc: `Payment for ${tx.category} waste (${tx.confirmed_qty_kg}kg)`,
      }),
    });

    const stkData = await stkRes.json();
    if (stkData.ResponseCode !== '0') {
      return res.status(502).json({
        error: stkData.errorMessage || stkData.ResponseDescription || 'M-Pesa STK Push failed',
      });
    }

    await pool.query(
      'UPDATE transactions SET checkout_request_id = $1 WHERE transaction_id = $2',
      [stkData.CheckoutRequestID, transactionId]
    );

    res.json({ message: 'M-Pesa prompt sent to your phone. Enter your PIN to complete payment.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/mpesa/callback — public webhook called by Safaricom after payment
exports.mpesaCallback = async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) return res.json({ ResultCode: 0, ResultDesc: 'OK' });

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = callback;

    if (ResultCode !== 0) {
      await pool.query(
        `UPDATE transactions SET payment_status = 'failed' WHERE checkout_request_id = $1`,
        [CheckoutRequestID]
      );
      return res.json({ ResultCode: 0, ResultDesc: 'OK' });
    }

    const items = CallbackMetadata?.Item || [];
    const mpesaCode = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null;

    const txUpdate = await pool.query(
      `UPDATE transactions
       SET payment_status = 'escrowed', mpesa_code = $1
       WHERE checkout_request_id = $2
       RETURNING log_id`,
      [mpesaCode, CheckoutRequestID]
    );

    if (txUpdate.rows.length > 0) {
      await pool.query(
        `UPDATE waste_logs SET status = 'confirmed' WHERE log_id = $1`,
        [txUpdate.rows[0].log_id]
      );
    }

    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  } catch (err) {
    console.error('M-Pesa callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'OK' }); // always 200 to Safaricom
  }
};

// PATCH /api/buyer/transactions/:transactionId/confirm-receipt
// Buyer confirms they received the waste; triggers B2C payout to collector.
// NOTE: Daraja sandbox B2C typically returns "Insufficient balance" — this is a
// sandbox platform limitation, not a code bug. The request is correctly formed.
exports.confirmReceipt = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const { transactionId } = req.params;

    const txResult = await pool.query(
      `SELECT t.*, wl.weight_kg, wl.category, wl.collector_id
       FROM transactions t
       JOIN waste_logs wl ON wl.log_id = t.log_id
       WHERE t.transaction_id = $1 AND t.buyer_id = $2`,
      [transactionId, buyerId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    if (tx.payment_status !== 'escrowed') {
      return res.status(400).json({ error: 'Transaction must be escrowed before confirming receipt' });
    }

    const claimResult = await pool.query(
      `UPDATE transactions SET payment_status = 'payout_initiated'
       WHERE transaction_id = $1 AND payment_status = 'escrowed'
       RETURNING transaction_id`,
      [transactionId]
    );
    if (claimResult.rows.length === 0) {
      return res.status(409).json({ error: 'Payout already in progress or completed for this transaction' });
    }

    const collectorResult = await pool.query(
      `SELECT u.phone_number FROM collectors c
       JOIN users u ON u.user_id = c.user_id
       WHERE c.collector_id = $1`,
      [tx.collector_id]
    );

    if (collectorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collector not found' });
    }

    let phone = String(collectorResult.rows[0].phone_number || '').replace(/\s+/g, '');
    if (phone.startsWith('0'))  phone = '254' + phone.slice(1);
    if (phone.startsWith('+'))  phone = phone.slice(1);

    const token = await getMpesaToken();
    const host = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'api.safaricom.co.ke'
      : 'sandbox.safaricom.co.ke';

    console.log('[B2C confirmReceipt] Initiating payout to', phone, 'amount', Math.ceil(parseFloat(tx.amount_kes)));

    const b2cRes = await darajaFetch(`https://${host}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        InitiatorName:      process.env.MPESA_B2C_INITIATOR_NAME,
        SecurityCredential: process.env.MPESA_B2C_SECURITY_CREDENTIAL,
        CommandID:          'SalaryPayment',
        Amount:             Math.ceil(parseFloat(tx.amount_kes)),
        PartyA:             process.env.MPESA_B2C_SHORTCODE,
        PartyB:             phone,
        Remarks:            `Payout for ${tx.weight_kg}kg ${tx.category}`,
        QueueTimeOutURL:    process.env.MPESA_B2C_TIMEOUT_URL,
        ResultURL:          process.env.MPESA_B2C_RESULT_URL,
        Occasion:           `WM-TX-${transactionId}`,
      }),
    });

    if (!b2cRes.ok) {
      const errorText = await b2cRes.text();
      console.error('[B2C confirmReceipt] Non-OK response:', b2cRes.status, errorText.slice(0, 300));
      await pool.query(
        `UPDATE transactions SET payment_status = 'payout_failed', payout_error = $1 WHERE transaction_id = $2`,
        [`Daraja returned ${b2cRes.status}: request may have been rate-limited or rejected by gateway`, transactionId]
      );
      return res.status(502).json({ error: 'M-Pesa service returned an unexpected response. Please wait a moment and try again.' });
    }

    const b2cData = await b2cRes.json();
    console.log('[B2C confirmReceipt] Daraja response:', JSON.stringify(b2cData));

    if (b2cData.ResponseCode !== '0') {
      await pool.query(
        `UPDATE transactions SET payment_status = 'payout_failed', payout_error = $1
         WHERE transaction_id = $2`,
        [b2cData.errorMessage || b2cData.ResponseDescription || JSON.stringify(b2cData), transactionId]
      );
      return res.status(502).json({
        error: b2cData.errorMessage || b2cData.ResponseDescription || 'B2C payout request failed',
      });
    }

    await pool.query(
      `UPDATE transactions SET b2c_conversation_id = $1 WHERE transaction_id = $2`,
      [b2cData.ConversationID, transactionId]
    );

    res.json({ message: 'Payout initiated. Awaiting confirmation.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/mpesa/b2c-result — Safaricom calls this when B2C payout completes/fails
exports.b2cResultCallback = async (req, res) => {
  try {
    const result = req.body?.Result;
    if (!result) return res.json({ ResultCode: 0, ResultDesc: 'OK' });

    const { ResultCode, ConversationID, ResultDesc } = result;
    console.log('[B2C result] ConversationID:', ConversationID, '| ResultCode:', ResultCode);

    const txResult = await pool.query(
      `SELECT transaction_id, log_id FROM transactions WHERE b2c_conversation_id = $1`,
      [ConversationID]
    );

    if (txResult.rows.length === 0) {
      console.error('[B2C result] No transaction found for ConversationID:', ConversationID);
      return res.json({ ResultCode: 0, ResultDesc: 'OK' });
    }

    const { transaction_id, log_id } = txResult.rows[0];

    if (ResultCode === 0) {
      await pool.query(
        `UPDATE transactions SET payment_status = 'released', released_at = NOW()
         WHERE transaction_id = $1`,
        [transaction_id]
      );
      await pool.query(
        `UPDATE waste_logs SET status = 'paid' WHERE log_id = $1`,
        [log_id]
      );
      console.log('[B2C result] Payout released for transaction', transaction_id);
    } else {
      await pool.query(
        `UPDATE transactions SET payment_status = 'payout_failed', payout_error = $1
         WHERE transaction_id = $2`,
        [ResultDesc || `B2C failed with code ${ResultCode}`, transaction_id]
      );
      console.error('[B2C result] Payout failed for transaction', transaction_id, ':', ResultDesc);
    }

    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  } catch (err) {
    console.error('[B2C result callback] Error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  }
};

// POST /api/mpesa/b2c-timeout — Safaricom calls this if B2C request times out in the queue
exports.b2cTimeoutCallback = (req, res) => {
  console.log('[B2C timeout] Received:', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: 'OK' });
};