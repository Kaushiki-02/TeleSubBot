// routes/logRoutes.js
const express = require("express");
const logController = require("../controllers/logController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authMiddleware.protect);

router.get(
  "/",
  authMiddleware.authorize("Log:read"),
  logController.getAuditLogs
);
router.get(
  "/export",
  authMiddleware.authorize("Log:export"),
  logController.exportAuditLogs
);

module.exports = router;
