const express = require('express');
const router = express.Router();
const ussdController = require('../controllers/ussd.controller');

router.post('/', ussdController.handleUssd);

module.exports = router;
