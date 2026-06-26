const express = require('express');
const router = express.Router();
const { mpesaCallback } = require('../controllers/buyer.controller');

// Public endpoint — Safaricom calls this after STK Push completes
router.post('/callback', mpesaCallback);

module.exports = router;
