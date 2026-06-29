const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const { getHeatmap, getStats, exportReport } = require('../controllers/coordinator.controller');

router.use(authenticate, authorize('coordinator'));

router.get('/heatmap', getHeatmap);
router.get('/stats',   getStats);
router.get('/export',  exportReport);

module.exports = router;
