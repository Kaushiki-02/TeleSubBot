// routes/channelRoutes.js
const express = require("express");
const channelController = require("../controllers/channelController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();

// Public route to get channel and plans by referral code
router.get(
  "/public/:referralCode",
  channelController.getPublicChannelByReferralCode
);

// Apply auth middleware to all subsequent routes
router.use(authMiddleware.protect);

// Admin/SuperAdmin Management Routes
router.get(
  "/",
  authMiddleware.authorize("Channel:read"),
  channelController.getAllChannels
);
router.post(
  "/",
  authMiddleware.authorize("Channel:create"),
  validation.validateCreateChannel,
  channelController.createChannel
);
router.get(
  "/:id",
  authMiddleware.authorize("Channel:read"),
  validation.validateMongoIdParam("id"),
  channelController.getChannel
);
router.put(
  "/:id",
  authMiddleware.authorize("Channel:update"),
  validation.validateMongoIdParam("id"),
  validation.validateUpdateChannel,
  channelController.updateChannel
);
router.delete(
  "/:id", // Hard Delete Channel
  authMiddleware.authorize("Channel:delete"),
  validation.validateMongoIdParam("id"),
  channelController.deleteChannel
);
router.put(
  "/:id/activate",
  authMiddleware.authorize("Channel:update"),
  validation.validateMongoIdParam("id"),
  channelController.activateChannel
);
router.put(
  "/:id/deactivate",
  authMiddleware.authorize("Channel:update"),
  validation.validateMongoIdParam("id"),
  channelController.deactivateChannel
);

module.exports = router;
