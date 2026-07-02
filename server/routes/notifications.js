const express    = require('express');
const router     = express.Router();
const authenticate = require('../middleware/authenticate');
const { getMyNotifications, markRead } = require('../controllers/notifications.controller');

router.get('/',        authenticate, getMyNotifications);
router.patch('/:id/read', authenticate, markRead);

module.exports = router;
