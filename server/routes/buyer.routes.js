const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const buyerController = require('../controllers/buyer.controller');

// All buyer routes require authentication + buyer role
router.use(authenticate, authorize('buyer'));

router.get('/offers', buyerController.getMyOffers);
router.post('/offers', buyerController.createOffer);
router.patch('/offers/:offerId', buyerController.updateOffer);
router.patch('/matches/:logId/confirm', buyerController.confirmMatch);
router.delete('/offers/:offerId', buyerController.deleteOffer);

router.get('/matches', buyerController.getMatches);
router.get('/transactions', buyerController.getMyTransactions);
router.post('/transactions/:transactionId/pay', buyerController.initiatePayment);

module.exports = router;