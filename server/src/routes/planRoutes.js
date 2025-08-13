// routes/planRoutes.js
const express = require("express");
const planController = require("../controllers/planController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();

// router.get("/active", planController.getActivePlans); // Public MAYBE deprecated

router.use(authMiddleware.protect);

router.get(
  "/",
  authMiddleware.authorize("Plan:read"),
  planController.getAllPlans
);
router.get(
  "/channel/:channelId", // New route for getting plans by channel ID
  authMiddleware.authorize("Plan:read"), // Reuse Plan:read or create specific permission
  validation.validateMongoIdParam("channelId"), // Validate the channelId param
  planController.getPlansByChannel // New controller function
);
router.post(
  "/",
  authMiddleware.authorize("Plan:create"),
  validation.validateCreatePlan,
  planController.createPlan
);
router.get(
  "/:id",
  authMiddleware.authorize("Plan:read"),
  validation.validateMongoIdParam("id"),
  planController.getPlan
);
router.put(
  "/:id",
  authMiddleware.authorize("Plan:update"),
  validation.validateMongoIdParam("id"),
  validation.validateUpdatePlan, // Use update validator
  planController.updatePlan
);
router.put(
  "/:id/deactivate",
  authMiddleware.authorize("Plan:delete"),
  validation.validateMongoIdParam("id"),
  planController.deactivatePlan
);

router.put(
  "/:id/activate",
  authMiddleware.authorize("Plan:update"),
  validation.validateMongoIdParam("id"),
  planController.activatePlan
);
router.delete(
  "/:id",
  authMiddleware.authorize("Plan:delete"),
  validation.validateMongoIdParam("id"),
  planController.deletePlan
);

module.exports = router;
