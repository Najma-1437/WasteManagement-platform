const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  createLog,
  getMyLogs,
  getLogById,
} = require("../controllers/wasteLogs.controller");

router.post("/", authenticate, authorize("collector"), createLog);
router.get("/my", authenticate, authorize("collector"), getMyLogs);
router.get("/:id", authenticate, getLogById);

module.exports = router;
