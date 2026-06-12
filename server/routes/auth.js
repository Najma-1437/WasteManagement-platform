const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  logout,
  me,
} = require("../controllers/auth.controller");
const authenticate = require("../middleware/authenticate");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", authenticate, me);

module.exports = router;
