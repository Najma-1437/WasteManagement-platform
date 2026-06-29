const pool = require('../config/db');


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
              t.transaction_date AS created_at,
              t.payout_error,
              t.released_at,
              (t.b2c_conversation_id IS NOT NULL) AS payout_initiated,
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
       SET status = 'matched'
       WHERE log_id = $1 AND status = 'pending'
       RETURNING log_id, weight_kg, status`,
      [logId]
    );

    if (logResult.rows.length === 0) {
      return res.status(409).json({ error: 'This log has already been claimed by another buyer' });
    }

    const weightKg = parseFloat(logResult.rows[0].weight_kg);
    const amountKes = (weightKg * pricePerKg).toFixed(2);

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

    console.log('[STK debug] BusinessShortCode:', shortcode, '| Timestamp:', timestamp, '| Password[:20]:', password.slice(0, 20));

    const stkRes = await fetch(`https://${host}/mpesa/stkpush/v1/processrequest`, {
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

// POST /api/mpesa/callback — public webhook called by Safaricom after STK Push
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
    console.error('M-Pesa STK callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'OK' }); // always 200 to Safaricom
  }
};

// Query Daraja for the current status of a previously-initiated STK Push.
// Returns the raw Daraja JSON — caller interprets ResultCode.
async function querySTKStatus(token, checkoutRequestId) {
  const host = process.env.MPESA_ENVIRONMENT === 'production'
    ? 'api.safaricom.co.ke'
    : 'sandbox.safaricom.co.ke';

  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey   = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const res = await fetch(`https://${host}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  return res.json();
}

// POST /api/buyer/transactions/:transactionId/check-status
// Fallback for when Daraja's STK callback never arrives (known sandbox issue).
// Buyer hits this manually after paying; we query Daraja directly and apply
// the same status transitions mpesaCallback would have done.
exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const { transactionId } = req.params;

    const txResult = await pool.query(
      `SELECT transaction_id, payment_status, checkout_request_id, log_id
       FROM transactions
       WHERE transaction_id = $1 AND buyer_id = $2`,
      [transactionId, buyerId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    if (tx.payment_status !== 'pending') {
      return res.status(400).json({
        error: `Transaction is already ${tx.payment_status} — no query needed`,
        payment_status: tx.payment_status,
      });
    }

    if (!tx.checkout_request_id) {
      return res.status(400).json({
        error: 'No STK Push has been initiated for this transaction yet',
      });
    }

    let data;
    try {
      const token = await getMpesaToken();
      data = await querySTKStatus(token, tx.checkout_request_id);
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach Safaricom to query payment status' });
    }

    // ResponseCode !== '0' means Daraja couldn't process the query itself
    if (data.ResponseCode !== '0') {
      return res.status(502).json({
        error: data.errorMessage || data.ResponseDescription || 'STK status query failed',
      });
    }

    if (data.ResultCode === '0') {
      // Payment confirmed — same transitions as a successful mpesaCallback
      await pool.query(
        `UPDATE transactions SET payment_status = 'escrowed' WHERE transaction_id = $1`,
        [tx.transaction_id]
      );
      await pool.query(
        `UPDATE waste_logs SET status = 'confirmed' WHERE log_id = $1`,
        [tx.log_id]
      );
      return res.json({
        payment_status: 'escrowed',
        message: 'Payment confirmed. Funds are held in escrow — confirm receipt to release payment to the collector.',
      });
    }

    // Non-zero ResultCode: not yet confirmed, cancelled, or failed.
    // Don't update the DB — the callback may still arrive (especially for "still processing").
    return res.json({
      payment_status: 'pending',
      result_code: data.ResultCode,
      message: data.ResultDesc || 'Payment not yet confirmed.',
    });
  } catch (err) {
    next(err);
  }
};

// ── B2C helpers ───────────────────────────────────────────────────────────────

// Shared B2C guard — used by confirmReceipt and retryPayout.
function b2cConfigured() {
  return !!process.env.MPESA_B2C_INITIATOR_NAME;
}

const B2C_NOT_CONFIGURED_MSG =
  'B2C payout not configured. Add MPESA_B2C_INITIATOR_NAME, ' +
  'MPESA_B2C_SECURITY_CREDENTIAL, MPESA_B2C_RESULT_URL, MPESA_B2C_TIMEOUT_URL ' +
  'to server/.env';

// Normalize any phone format to 254XXXXXXXXX (Daraja requirement).
function normalizeMpesaPhone(raw) {
  let p = String(raw || '').replace(/\s+/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '254' + p.slice(1);
  return p;
}

// Shared transaction + collector-phone lookup used by confirmReceipt and retryPayout.
async function getEscrowTx(transactionId, buyerId) {
  const result = await pool.query(
    `SELECT t.transaction_id, t.payment_status, t.amount_kes, t.confirmed_qty_kg,
            t.b2c_conversation_id,
            wl.category,
            u.phone_number AS collector_phone
     FROM transactions t
     JOIN waste_logs wl ON wl.log_id = t.log_id
     JOIN collectors c  ON c.collector_id = wl.collector_id
     JOIN users u       ON u.user_id = c.user_id
     WHERE t.transaction_id = $1 AND t.buyer_id = $2`,
    [transactionId, buyerId]
  );
  return result.rows[0] || null;
}

// Call Daraja B2C paymentrequest. Returns the ConversationID from the
// synchronous acceptance response. Throws on rejection.
async function callB2c(token, collectorPhone, amountKes, transactionId, category, qtyKg) {
  const host = process.env.MPESA_ENVIRONMENT === 'production'
    ? 'api.safaricom.co.ke'
    : 'sandbox.safaricom.co.ke';

  const res = await fetch(`https://${host}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      InitiatorName:       process.env.MPESA_B2C_INITIATOR_NAME,
      SecurityCredential:  process.env.MPESA_B2C_SECURITY_CREDENTIAL,
      CommandID:           'SalaryPayment',
      Amount:              Math.round(parseFloat(amountKes)),
      PartyA:              process.env.MPESA_SHORTCODE,
      PartyB:              collectorPhone,
      Remarks:             `Waste payout WM-TX-${transactionId} (${category} ${qtyKg}kg)`,
      QueueTimeOutURL:     process.env.MPESA_B2C_TIMEOUT_URL,
      ResultURL:           process.env.MPESA_B2C_RESULT_URL,
      Occasion:            '',
    }),
  });

  const data = await res.json();
  console.log('[B2C callB2c] Daraja sync response:', JSON.stringify(data));
  if (data.ResponseCode !== '0') {
    throw new Error(
      data.ResponseDescription || data.errorMessage || 'B2C request rejected by Safaricom'
    );
  }
  return data.ConversationID;
}

// Query Daraja for the current status of a previously-initiated B2C.
// The actual outcome arrives asynchronously via MPESA_TXN_STATUS_RESULT_URL.
async function queryTxnStatus(token, b2cConversationId) {
  const host = process.env.MPESA_ENVIRONMENT === 'production'
    ? 'api.safaricom.co.ke'
    : 'sandbox.safaricom.co.ke';

  const res = await fetch(`https://${host}/mpesa/transactionstatus/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Initiator:              process.env.MPESA_B2C_INITIATOR_NAME,
      SecurityCredential:     process.env.MPESA_B2C_SECURITY_CREDENTIAL,
      CommandID:              'TransactionStatusQuery',
      TransactionID:          '',
      OriginalConversationID: b2cConversationId,
      PartyA:                 process.env.MPESA_SHORTCODE,
      IdentifierType:         '4',
      ResultURL:              process.env.MPESA_TXN_STATUS_RESULT_URL,
      QueueTimeOutURL:        process.env.MPESA_TXN_STATUS_TIMEOUT_URL,
      Remarks:                'payout status check',
      Occasion:               '',
    }),
  });
  return res.json();
}

// ── PATCH /api/buyer/transactions/:transactionId/confirm-receipt ──────────────
// Buyer confirms physical receipt of waste → triggers B2C disbursement to collector.
// Precondition: payment_status = 'escrowed' (buyer's STK payment has landed).
exports.confirmReceipt = async (req, res, next) => {
  try {
    if (!b2cConfigured()) {
      return res.status(501).json({ error: B2C_NOT_CONFIGURED_MSG });
    }

    const buyerId = await getBuyerId(req.user.user_id);
    const { transactionId } = req.params;

    const tx = await getEscrowTx(transactionId, buyerId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (tx.payment_status !== 'escrowed') {
      return res.status(400).json({
        error: `Cannot confirm receipt: transaction must be in 'escrowed' state (currently '${tx.payment_status}')`,
      });
    }

    if (tx.b2c_conversation_id) {
      return res.status(409).json({
        error: 'A payout is already in progress for this transaction.',
      });
    }

    const phone = normalizeMpesaPhone(tx.collector_phone);

    console.log(`[B2C confirmReceipt] tx=${transactionId} phone=${phone} amount=${tx.amount_kes}`);

    let conversationId;
    try {
      const token = await getMpesaToken();
      conversationId = await callB2c(
        token, phone, tx.amount_kes, tx.transaction_id, tx.category, tx.confirmed_qty_kg
      );
    } catch (b2cErr) {
      return res.status(502).json({
        error: b2cErr.message || 'Payout request failed. Please try again.',
      });
    }

    console.log(`[B2C confirmReceipt] accepted by Daraja, ConversationID=${conversationId}`);

    await pool.query(
      'UPDATE transactions SET b2c_conversation_id = $1 WHERE transaction_id = $2',
      [conversationId, tx.transaction_id]
    );

    res.json({
      message: 'Payout request sent to Safaricom. The collector will receive M-Pesa payment once confirmed.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/buyer/transactions/:transactionId/check-payout-status ──────────
// Manual fallback for when Daraja's B2C result callback never arrives.
// Fires a Transaction Status query; the actual result comes back asynchronously
// via /api/mpesa/txn-status-result. txn_status_conversation_id on the transaction links the two.
exports.checkPayoutStatus = async (req, res, next) => {
  try {
    const buyerId = await getBuyerId(req.user.user_id);
    const { transactionId } = req.params;

    const txResult = await pool.query(
      `SELECT transaction_id, payment_status, b2c_conversation_id
       FROM transactions
       WHERE transaction_id = $1 AND buyer_id = $2`,
      [transactionId, buyerId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];

    if (tx.payment_status !== 'escrowed') {
      return res.status(400).json({
        error: `Cannot check payout status: transaction must be in 'escrowed' state (currently '${tx.payment_status}')`,
        payment_status: tx.payment_status,
      });
    }

    if (!tx.b2c_conversation_id) {
      return res.status(400).json({
        error: 'No B2C payout has been initiated for this transaction yet.',
      });
    }

    let data;
    try {
      const token = await getMpesaToken();
      data = await queryTxnStatus(token, tx.b2c_conversation_id);
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach Safaricom to query payout status' });
    }

    console.log('[TxnStatus checkPayoutStatus] Daraja sync response:', JSON.stringify(data));

    if (data.ResponseCode !== '0') {
      return res.status(502).json({
        error: data.ResponseDescription || data.errorMessage || 'Payout status query rejected by Safaricom',
      });
    }

    await pool.query(
      'UPDATE transactions SET txn_status_conversation_id = $1 WHERE transaction_id = $2',
      [data.ConversationID, tx.transaction_id]
    );

    return res.json({
      message: 'Payout status query sent to Safaricom. Refresh in a few seconds to see the updated status.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/mpesa/b2c-result — public, called by Safaricom after B2C completes
exports.b2cResultCallback = async (req, res) => {
  try {
    const result = req.body?.Result;
    if (!result) return res.json({ ResultCode: 0, ResultDesc: 'OK' });

    const { ResultCode, ResultDesc, ConversationID } = result;

    console.log('[B2C result] received ConversationID:', ConversationID, '| ResultCode:', ResultCode, '| ResultDesc:', ResultDesc);

    const txResult = await pool.query(
      'SELECT transaction_id, log_id FROM transactions WHERE b2c_conversation_id = $1',
      [ConversationID]
    );

    if (txResult.rows.length === 0) {
      console.warn('[B2C result] No transaction found for ConversationID:', ConversationID);
      return res.json({ ResultCode: 0, ResultDesc: 'OK' });
    }

    const { transaction_id, log_id } = txResult.rows[0];

    if (ResultCode === 0) {
      await pool.query(
        `UPDATE transactions SET payment_status = 'released', released_at = NOW() WHERE transaction_id = $1`,
        [transaction_id]
      );
      await pool.query(
        `UPDATE waste_logs SET status = 'paid' WHERE log_id = $1`,
        [log_id]
      );
    } else {
      await pool.query(
        `UPDATE transactions SET payment_status = 'payout_failed', payout_error = $1 WHERE transaction_id = $2`,
        [ResultDesc || 'Safaricom B2C payout failed.', transaction_id]
      );
      // waste_logs.status stays 'confirmed' — buyer paid in; log remains tied to
      // this transaction even though the collector hasn't been disbursed yet.
    }

    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  } catch (err) {
    console.error('[B2C result callback error]', err);
    res.json({ ResultCode: 0, ResultDesc: 'OK' }); // always 200 to Safaricom
  }
};

// ── POST /api/mpesa/b2c-timeout — public, called by Safaricom on B2C queue timeout
exports.b2cTimeoutCallback = async (req, res) => {
  try {
    const conversationId = req.body?.Result?.ConversationID;
    if (!conversationId) return res.json({ ResultCode: 0, ResultDesc: 'OK' });

    const txResult = await pool.query(
      'SELECT transaction_id FROM transactions WHERE b2c_conversation_id = $1',
      [conversationId]
    );

    if (txResult.rows.length > 0) {
      await pool.query(
        `UPDATE transactions
         SET payment_status = 'payout_failed',
             payout_error   = 'Payout request timed out. Safaricom did not process the disbursement within the expected window.'
         WHERE transaction_id = $1`,
        [txResult.rows[0].transaction_id]
      );
    }

    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  } catch (err) {
    console.error('[B2C timeout callback error]', err);
    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  }
};

// ── POST /api/buyer/transactions/:transactionId/retry-payout ─────────────────
// Buyer manually retries a failed B2C disbursement.
// Precondition: payment_status = 'payout_failed'.
// No retry-count limit in this version (see spec section 6, open item flagged).
exports.retryPayout = async (req, res, next) => {
  try {
    if (!b2cConfigured()) {
      return res.status(501).json({ error: B2C_NOT_CONFIGURED_MSG });
    }

    const buyerId = await getBuyerId(req.user.user_id);
    const { transactionId } = req.params;

    const tx = await getEscrowTx(transactionId, buyerId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (tx.payment_status !== 'payout_failed') {
      return res.status(400).json({
        error: `Cannot retry payout: transaction must be in 'payout_failed' state (currently '${tx.payment_status}')`,
      });
    }

    const phone = normalizeMpesaPhone(tx.collector_phone);

    let conversationId;
    try {
      const token = await getMpesaToken();
      conversationId = await callB2c(
        token, phone, tx.amount_kes, tx.transaction_id, tx.category, tx.confirmed_qty_kg
      );
    } catch (b2cErr) {
      return res.status(502).json({
        error: b2cErr.message || 'Payout retry failed. Please try again.',
      });
    }

    // B2C accepted: reset to 'escrowed' so the buyer's UI shows "processing"
    // while waiting for the async result callback.
    await pool.query(
      `UPDATE transactions
       SET payment_status = 'escrowed', payout_error = NULL, b2c_conversation_id = $1
       WHERE transaction_id = $2`,
      [conversationId, tx.transaction_id]
    );

    res.json({
      message: 'Payout retry sent to Safaricom. The collector will receive M-Pesa payment once confirmed.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/mpesa/txn-status-result — public, called by Safaricom with the
// outcome of a Transaction Status query fired by checkPayoutStatus.
exports.txnStatusResultCallback = async (req, res) => {
  try {
    const result = req.body?.Result;
    if (!result) return res.json({ ResultCode: 0, ResultDesc: 'OK' });

    const { ResultCode, ResultDesc, ConversationID } = result;

    console.log('[TxnStatus result] ConversationID:', ConversationID, '| ResultCode:', ResultCode, '| ResultDesc:', ResultDesc);

    const txResult = await pool.query(
      'SELECT transaction_id, log_id, payment_status FROM transactions WHERE txn_status_conversation_id = $1',
      [ConversationID]
    );

    if (txResult.rows.length === 0) {
      console.warn('[TxnStatus result] No transaction found for txn_status_conversation_id:', ConversationID);
      return res.json({ ResultCode: 0, ResultDesc: 'OK' });
    }

    const { transaction_id, log_id, payment_status } = txResult.rows[0];

    if (payment_status !== 'escrowed') {
      return res.json({ ResultCode: 0, ResultDesc: 'OK' });
    }

    if (ResultCode === 0) {
      await pool.query(
        `UPDATE transactions SET payment_status = 'released', released_at = NOW() WHERE transaction_id = $1`,
        [transaction_id]
      );
      await pool.query(
        `UPDATE waste_logs SET status = 'paid' WHERE log_id = $1`,
        [log_id]
      );
    } else {
      await pool.query(
        `UPDATE transactions SET payment_status = 'payout_failed', payout_error = $1 WHERE transaction_id = $2`,
        [ResultDesc || 'Safaricom payout status check indicated failure.', transaction_id]
      );
    }

    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  } catch (err) {
    console.error('[TxnStatus result callback error]', err);
    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  }
};

// ── POST /api/mpesa/txn-status-timeout — public, called by Safaricom on timeout
exports.txnStatusTimeoutCallback = async (req, res) => {
  try {
    const conversationId = req.body?.Result?.ConversationID;
    if (conversationId) {
      console.warn('[TxnStatus timeout] ConversationID:', conversationId);
    }
    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  } catch (err) {
    console.error('[TxnStatus timeout callback error]', err);
    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  }
};