const express = require('express');
const router = express.Router();
const {
  mpesaCallback,
  b2cResultCallback,
  b2cTimeoutCallback,
} = require('../controllers/buyer.controller');

// Public endpoints — Safaricom calls these; no auth middleware
router.post('/callback',    mpesaCallback);
router.post('/b2c-result',  b2cResultCallback);
router.post('/b2c-timeout', b2cTimeoutCallback);

module.exports = router;
