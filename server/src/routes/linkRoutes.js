// routes/linkRoutes.js
const express = require("express");
const linkController = require("../controllers/linkController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public route - no auth needed
router.get("/public/:slug", linkController.getPublicLinkDetails);

// Apply auth middleware to all subsequent routes
router.use(authMiddleware.protect);

router.post(
  "/",
  authMiddleware.authorize("Link:create"),
  validation.validateCreateLink,
  linkController.createLink
);
router.get(
  "/my-links",
  authMiddleware.authorize("Link:read:own"),
  linkController.getMyLinks
);
router.get(
  "/",
  authMiddleware.authorize("Link:read:all"),
  linkController.getAllLinks
);
router.get(
  "/export/all",
  authMiddleware.authorize("Link:export"),
  linkController.exportLinks
);
router.post(
  "/import",
  authMiddleware.authorize("Link:import"),
  uploadMiddleware.uploadCsv,
  linkController.importLinks
);

// ID-specific routes
// Use authorize with multiple permissions (checks if user has AT LEAST ONE)
router.get(
  "/:id",
  authMiddleware.authorize("Link:read:all", "Link:read:own"),
  validation.validateMongoIdParam("id"), // Validation runs AFTER authorize
  linkController.getLink
);
router.put(
  "/:id",
  authMiddleware.authorize("Link:update:all", "Link:update:own"),
  validation.validateMongoIdParam("id"),
  // Note: No specific update validation applied here by default,
  // controller handles allowed fields. Add one if needed.
  linkController.updateLink
);
router.delete(
  "/:id",
  authMiddleware.authorize("Link:delete:all", "Link:delete:own"),
  validation.validateMongoIdParam("id"),
  linkController.deleteLink
);

module.exports = router;
