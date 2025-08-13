// routes/reminderRoutes.js
const express = require("express");
const reminderController = require("../controllers/reminderController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(authMiddleware.protect);

// Template Management
router.post(
  "/templates",
  authMiddleware.authorize("ReminderTemplate:create"),
  validation.validateCreateReminderTemplate,
  reminderController.createReminderTemplate
);
router.get(
  "/templates",
  authMiddleware.authorize("ReminderTemplate:read"),
  reminderController.getAllReminderTemplates
);
router.get(
  "/templates/:id",
  authMiddleware.authorize("ReminderTemplate:read"),
  validation.validateMongoIdParam("id"),
  reminderController.getReminderTemplate
);
router.put(
  "/templates/:id",
  authMiddleware.authorize("ReminderTemplate:update"),
  validation.validateMongoIdParam("id"),
  validation.validateUpdateReminderTemplate, // Use update validator
  reminderController.updateReminderTemplate
);
router.delete(
  "/templates/:id",
  authMiddleware.authorize("ReminderTemplate:delete"),
  validation.validateMongoIdParam("id"),
  reminderController.deleteReminderTemplate
);

// Delivery Reports
router.get(
  "/delivery-reports",
  authMiddleware.authorize("Reminder:read"),
  reminderController.getDeliveryReports
);

module.exports = router;
