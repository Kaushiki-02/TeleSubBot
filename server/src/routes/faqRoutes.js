// routes/faqRoutes.js
const express = require("express");
const faqController = require("../controllers/faqController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();

// router.get("/active", faqController.getActiveFAQs); // Public

router.use(authMiddleware.protect);

router.post(
  "/",
  authMiddleware.authorize("FAQ:manage"),
  validation.validateCreateFAQ,
  faqController.createFAQ
);
router.get("/", authMiddleware.authorize("FAQ:read"), faqController.getAllFAQs);
router.get(
  "/:id",
  authMiddleware.authorize("FAQ:read"),
  validation.validateMongoIdParam("id"),
  faqController.getFAQ
);
router.put(
  "/:id",
  authMiddleware.authorize("FAQ:manage"),
  validation.validateMongoIdParam("id"),
  validation.validateUpdateFAQ, // Use update validator
  faqController.updateFAQ
);
router.delete(
  "/:id",
  authMiddleware.authorize("FAQ:manage"),
  validation.validateMongoIdParam("id"),
  faqController.deleteFAQ
);

module.exports = router;
