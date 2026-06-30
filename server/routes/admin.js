const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getStats, getPending, approveUser, rejectUser,
  getUsers, updateUserStatus, getDisputes, resolveDispute,
} = require('../controllers/admin.controller');

router.use(authenticate, authorize('admin'));

router.get('/stats',                  getStats);
router.get('/pending',                getPending);
router.patch('/users/:id/approve',    approveUser);
router.patch('/users/:id/reject',     rejectUser);
router.get('/users',                  getUsers);
router.patch('/users/:id/status',     updateUserStatus);
router.get('/disputes',               getDisputes);
router.patch('/disputes/:id/resolve', resolveDispute);

module.exports = router;
