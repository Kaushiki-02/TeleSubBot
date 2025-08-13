// routes/subscriptionRoutes.js
const express = require("express");
const subscriptionController = require("../controllers/subscriptionController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();

router.use(authMiddleware.protect);

// User routes
router.get(
  "/my-groups",
  authMiddleware.authorize("Subscription:read:own"),
  subscriptionController.getMySubscriptions
);

router.post(
  "/upgrade/:id",
  authMiddleware.authorize("Subscription:upgrade"),
  validation.validateSubscriptionUpgrade,
  subscriptionController.initiateUpgrade
);

// Support route
router.put(
  "/extend/:id",
  authMiddleware.authorize("Subscription:extend"),
  validation.validateExtendSubscription,
  subscriptionController.extendSubscription
);
router.put(
  "/extend/bulk",
  authMiddleware.authorize("Subscription:extend"),
  validation.validateBulkExtendSubscription,
  subscriptionController.bulkExtendSubscription
);

// Admin/SuperAdmin/Support read routes
router.get(
  "/",
  authMiddleware.authorize("Subscription:read:all"),
  subscriptionController.getAllSubscriptions
);
router.get(
  "/:id",
  authMiddleware.authorize("Subscription:read"), // Base read permission for Admin/Support
  validation.validateMongoIdParam("id"),
  subscriptionController.getSubscription
);

// Admin/SuperAdmin write route
router.put(
  "/revoke/:id",
  authMiddleware.authorize("Subscription:revoke"),
  validation.validateMongoIdParam("id"),
  subscriptionController.revokeSubscription
);

module.exports = router;
