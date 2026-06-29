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
router.patch('/transactions/:transactionId/confirm-receipt', buyerController.confirmReceipt);
router.post('/transactions/:transactionId/retry-payout', buyerController.retryPayout);
router.post('/transactions/:transactionId/check-status', buyerController.checkPaymentStatus);
router.post('/transactions/:transactionId/check-payout-status', buyerController.checkPayoutStatus);

module.exports = router;