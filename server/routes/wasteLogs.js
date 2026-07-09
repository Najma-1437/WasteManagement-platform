const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  createLog,
  getMyLogs,
  getLogById,
  updateLog,
  raiseDispute,
  deleteLog,
  getMyEarnings,
  getMyMatches,
} = require("../controllers/wasteLogs.controller");

router.post("/", authenticate, authorize("collector"), createLog);
router.get("/my", authenticate, authorize("collector"), getMyLogs);
router.get("/my/earnings", authenticate, authorize("collector"), getMyEarnings);
router.get("/my/matches", authenticate, authorize("collector"), getMyMatches);
router.get("/:id", authenticate, getLogById);
router.post("/:id/dispute", authenticate, authorize("collector", "buyer"), raiseDispute);
router.patch("/:id", authenticate, authorize("collector"), updateLog);
router.delete("/:id", authenticate, authorize("collector"), deleteLog);

module.exports = router;
