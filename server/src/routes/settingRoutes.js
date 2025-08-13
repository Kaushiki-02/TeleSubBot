// routes/settingRoutes.js
const express = require("express");
const settingController = require("../controllers/settingController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(authMiddleware.protect);

router.get(
  "/",
  authMiddleware.authorize("Setting:read"),
  settingController.getAllSettings
);
router.get(
  "/:key",
  authMiddleware.authorize("Setting:read"),
  validation.validateKeyParam("key"),
  settingController.getSetting
);
router.put(
  // Update existing by key
  "/:key",
  authMiddleware.authorize("Setting:manage"),
  validation.validateKeyParam("key"),
  validation.validateUpsertSetting,
  settingController.upsertSetting
);
router.post(
  // Create new
  "/",
  authMiddleware.authorize("Setting:manage"),
  validation.validateUpsertSetting,
  settingController.upsertSetting
);
router.delete(
  "/:key",
  authMiddleware.authorize("Setting:manage"),
  validation.validateKeyParam("key"),
  settingController.deleteSetting
);

module.exports = router;
