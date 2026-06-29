const express = require('express');
const router = express.Router();
const {
  mpesaCallback,
  b2cResultCallback,
  b2cTimeoutCallback,
  txnStatusResultCallback,
  txnStatusTimeoutCallback,
} = require('../controllers/buyer.controller');

// Safaricom STK Push result
router.post('/callback', mpesaCallback);

// Safaricom B2C result and timeout (MPESA_B2C_RESULT_URL / MPESA_B2C_TIMEOUT_URL)
router.post('/b2c-result',  b2cResultCallback);
router.post('/b2c-timeout', b2cTimeoutCallback);

// Safaricom Transaction Status result and timeout (MPESA_TXN_STATUS_RESULT_URL / MPESA_TXN_STATUS_TIMEOUT_URL)
router.post('/txn-status-result',  txnStatusResultCallback);
router.post('/txn-status-timeout', txnStatusTimeoutCallback);

module.exports = router;
