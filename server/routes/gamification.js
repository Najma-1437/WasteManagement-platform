const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getMyPoints,
  getLeaderboard,
  redeemPoints,
} = require('../controllers/gamification.controller');

router.get('/me',          authenticate, authorize('collector'), getMyPoints);
router.get('/leaderboard', authenticate,                         getLeaderboard);
router.post('/redeem',     authenticate, authorize('collector'), redeemPoints);

module.exports = router;
