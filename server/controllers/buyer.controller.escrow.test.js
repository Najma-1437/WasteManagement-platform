'use strict';

// Mock pg pool before the controller is required so the module never opens a
// real DB connection during tests.
jest.mock('../config/db', () => ({ query: jest.fn() }));
const pool = require('../config/db');

// All outbound HTTP (OAuth token + Daraja calls) goes through this mock.
global.fetch = jest.fn();

const ctrl = require('./buyer.controller');

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkRR(reqOverrides = {}) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
    send:   jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  const req  = { user: { user_id: 1 }, params: {}, body: {}, ...reqOverrides };
  return { req, res, next };
}

// Queue successive pool.query return values. Each element is an array of rows.
function poolReturns(...rowArrays) {
  rowArrays.forEach(rows => pool.query.mockResolvedValueOnce({ rows }));
}

// Queue successive fetch return values.
function fetchReturns(...payloads) {
  payloads.forEach(payload =>
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => payload })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Minimum env vars required for B2C paths
  process.env.MPESA_CONSUMER_KEY             = 'test_key';
  process.env.MPESA_CONSUMER_SECRET          = 'test_secret';
  process.env.MPESA_SHORTCODE                = '174379';
  process.env.MPESA_B2C_INITIATOR_NAME       = 'testapi';
  process.env.MPESA_B2C_SECURITY_CREDENTIAL  = 'base64EncodedCred==';
  process.env.MPESA_B2C_RESULT_URL           = 'https://example.ngrok.io/api/mpesa/b2c-result';
  process.env.MPESA_B2C_TIMEOUT_URL          = 'https://example.ngrok.io/api/mpesa/b2c-timeout';
});

// ── mpesaCallback (modified) ──────────────────────────────────────────────────

describe('mpesaCallback', () => {
  test('success: sets escrowed on transaction, confirmed on waste_log', async () => {
    poolReturns(
      [{ log_id: 42 }],  // UPDATE transactions RETURNING log_id
      [],                // UPDATE waste_logs
    );
    const { req, res } = mkRR({
      body: {
        Body: {
          stkCallback: {
            ResultCode: 0,
            CheckoutRequestID: 'ws_CO_123',
            CallbackMetadata: {
              Item: [{ Name: 'MpesaReceiptNumber', Value: 'QJP3XZ9KL1' }],
            },
          },
        },
      },
    });

    await ctrl.mpesaCallback(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining("payment_status = 'escrowed'"),
      ['QJP3XZ9KL1', 'ws_CO_123'],
    );
    expect(pool.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining("status = 'confirmed'"),
      [42],
    );
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });

  test('failure (ResultCode !== 0): sets failed, does not touch waste_log', async () => {
    poolReturns([]);
    const { req, res } = mkRR({
      body: {
        Body: {
          stkCallback: { ResultCode: 1032, CheckoutRequestID: 'ws_CO_456' },
        },
      },
    });

    await ctrl.mpesaCallback(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("payment_status = 'failed'"),
      ['ws_CO_456'],
    );
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });

  test('missing body: returns OK without touching DB', async () => {
    const { req, res } = mkRR({ body: {} });
    await ctrl.mpesaCallback(req, res);
    expect(pool.query).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });
});

// ── confirmReceipt ────────────────────────────────────────────────────────────

describe('confirmReceipt', () => {
  test('returns 501 when B2C env vars are missing', async () => {
    delete process.env.MPESA_B2C_INITIATOR_NAME;
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.confirmReceipt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('passes 404 error to next() when buyer profile not found', async () => {
    poolReturns([]);  // getBuyerId → no rows
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.confirmReceipt(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  test('returns 404 when transaction not found or not owned by this buyer', async () => {
    poolReturns(
      [{ buyer_id: 7 }],  // getBuyerId
      [],                 // transaction query → not found / wrong buyer
    );
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.confirmReceipt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when payment_status is not escrowed', async () => {
    poolReturns(
      [{ buyer_id: 7 }],
      [{
        transaction_id: 99, payment_status: 'pending',
        amount_kes: '500.00', confirmed_qty_kg: '20',
        category: 'plastic', collector_phone: '254712345678',
      }],
    );
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.confirmReceipt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('escrowed') })
    );
  });

  test('returns 502 and does not change DB when Safaricom rejects B2C', async () => {
    poolReturns(
      [{ buyer_id: 7 }],
      [{
        transaction_id: 99, payment_status: 'escrowed',
        amount_kes: '500.00', confirmed_qty_kg: '20',
        category: 'plastic', collector_phone: '254712345678',
      }],
    );
    fetchReturns(
      { access_token: 'tok123' },
      { ResponseCode: '1', ResponseDescription: 'Insufficient funds' },
    );
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.confirmReceipt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Insufficient funds' })
    );
    // DB must not be touched after the failed B2C (no conversation_id to store)
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('happy path: stores conversation_id and returns 200', async () => {
    poolReturns(
      [{ buyer_id: 7 }],
      [{
        transaction_id: 99, payment_status: 'escrowed',
        amount_kes: '500.00', confirmed_qty_kg: '20',
        category: 'plastic', collector_phone: '254712345678',
      }],
      [],  // UPDATE transactions SET b2c_conversation_id
    );
    fetchReturns(
      { access_token: 'tok123' },
      { ResponseCode: '0', ConversationID: 'AG_2024_XYZ' },
    );
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.confirmReceipt(req, res, next);

    expect(pool.query).toHaveBeenNthCalledWith(3,
      expect.stringContaining('b2c_conversation_id'),
      ['AG_2024_XYZ', 99],
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

// ── b2cResultCallback ─────────────────────────────────────────────────────────

describe('b2cResultCallback', () => {
  test('success (ResultCode 0): sets released on transaction and paid on waste_log', async () => {
    poolReturns(
      [{ transaction_id: 99, log_id: 42 }],  // find by b2c_conversation_id
      [],                                     // UPDATE transactions → released
      [],                                     // UPDATE waste_logs → paid
    );
    const { req, res } = mkRR({
      body: {
        Result: {
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          ConversationID: 'AG_2024_XYZ',
        },
      },
    });

    await ctrl.b2cResultCallback(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining("payment_status = 'released'"),
      expect.arrayContaining([99]),
    );
    expect(pool.query).toHaveBeenNthCalledWith(3,
      expect.stringContaining("status = 'paid'"),
      [42],
    );
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });

  test('failure (ResultCode !== 0): sets payout_failed with ResultDesc, waste_log stays confirmed', async () => {
    poolReturns(
      [{ transaction_id: 99, log_id: 42 }],
      [],  // UPDATE transactions → payout_failed
    );
    const { req, res } = mkRR({
      body: {
        Result: {
          ResultCode: 2001,
          ResultDesc: 'Insufficient funds in sender account.',
          ConversationID: 'AG_2024_XYZ',
        },
      },
    });

    await ctrl.b2cResultCallback(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining("payment_status = 'payout_failed'"),
      expect.arrayContaining(['Insufficient funds in sender account.', 99]),
    );
    // waste_logs must NOT be updated — status stays 'confirmed'
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });

  test('unknown ConversationID: returns OK without crashing or extra DB writes', async () => {
    poolReturns([]);  // no transaction found
    const { req, res } = mkRR({
      body: { Result: { ResultCode: 0, ConversationID: 'UNKNOWN_ID' } },
    });

    await ctrl.b2cResultCallback(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });

  test('missing body: returns OK without touching DB', async () => {
    const { req, res } = mkRR({ body: {} });
    await ctrl.b2cResultCallback(req, res);
    expect(pool.query).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });
});

// ── b2cTimeoutCallback ────────────────────────────────────────────────────────

describe('b2cTimeoutCallback', () => {
  test('sets payout_failed with a timeout message', async () => {
    poolReturns(
      [{ transaction_id: 99 }],  // find by b2c_conversation_id
      [],                        // UPDATE
    );
    const { req, res } = mkRR({
      body: { Result: { ConversationID: 'AG_2024_XYZ' } },
    });

    await ctrl.b2cTimeoutCallback(req, res);

    expect(pool.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining("payment_status = 'payout_failed'"),
      [99],
    );
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });

  test('missing ConversationID: returns OK without touching DB', async () => {
    const { req, res } = mkRR({ body: { Result: {} } });
    await ctrl.b2cTimeoutCallback(req, res);
    expect(pool.query).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 0, ResultDesc: 'OK' });
  });
});

// ── retryPayout ───────────────────────────────────────────────────────────────

describe('retryPayout', () => {
  test('returns 501 when B2C env vars are missing', async () => {
    delete process.env.MPESA_B2C_INITIATOR_NAME;
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.retryPayout(req, res, next);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('passes 404 error to next() when buyer profile not found', async () => {
    poolReturns([]);
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.retryPayout(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  test('returns 404 when transaction not found or not owned by this buyer', async () => {
    poolReturns([{ buyer_id: 7 }], []);
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.retryPayout(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 400 when payment_status is not payout_failed', async () => {
    poolReturns(
      [{ buyer_id: 7 }],
      [{
        transaction_id: 99, payment_status: 'escrowed',
        amount_kes: '500.00', confirmed_qty_kg: '20',
        category: 'plastic', collector_phone: '254712345678',
      }],
    );
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.retryPayout(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('payout_failed') })
    );
  });

  // escrowed → payout_failed → [retry] → escrowed → released
  // This test covers the "retry resets to escrowed" transition before the async callback.
  test('happy path: re-sends B2C, resets status to escrowed with new conversation_id', async () => {
    poolReturns(
      [{ buyer_id: 7 }],
      [{
        transaction_id: 99, payment_status: 'payout_failed',
        amount_kes: '500.00', confirmed_qty_kg: '20',
        category: 'plastic', collector_phone: '254712345678',
      }],
      [],  // UPDATE → escrowed + new conversation_id
    );
    fetchReturns(
      { access_token: 'tok456' },
      { ResponseCode: '0', ConversationID: 'AG_2024_RETRY' },
    );
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.retryPayout(req, res, next);

    expect(pool.query).toHaveBeenNthCalledWith(3,
      expect.stringContaining("payment_status = 'escrowed'"),
      ['AG_2024_RETRY', 99],
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 502 when Safaricom rejects the retry B2C call', async () => {
    poolReturns(
      [{ buyer_id: 7 }],
      [{
        transaction_id: 99, payment_status: 'payout_failed',
        amount_kes: '500.00', confirmed_qty_kg: '20',
        category: 'plastic', collector_phone: '254712345678',
      }],
    );
    fetchReturns(
      { access_token: 'tok456' },
      { ResponseCode: '1', ResponseDescription: 'Invalid initiator credentials' },
    );
    const { req, res, next } = mkRR({ params: { transactionId: '99' } });

    await ctrl.retryPayout(req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    // status must NOT have changed — still payout_failed so buyer can try again
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
