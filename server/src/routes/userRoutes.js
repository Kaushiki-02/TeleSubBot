// routes/userRoutes.js
const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(authMiddleware.protect);

// User's own actions
router.get(
  "/me",
  authMiddleware.authorize("User:read:own"),
  userController.getMe
);
router.post(
  "/kyc",
  authMiddleware.authorize("User:submit:kyc"),
  validation.validateKyc,
  userController.submitKyc
);
router.post(
  "/dob",
  authMiddleware.authorize("User:update:own"),
  userController.updatedDobUser
);
router.post(
  "/namemail",
  authMiddleware.authorize("User:update:own"),
  userController.updatednamemailUser
);
router.post(
  "/kyc/sub",
  authMiddleware.authorize("User:submit:kyc"),
  validation.validateKyc,
  userController.submitKycsub
);
router.post(
  "/me/telegram",
  authMiddleware.authorize("User:update:own"),
  validation.validateLinkTelegram,
  userController.linkTelegramusername
);

// Admin/SuperAdmin/Support actions on users (based on permissions)
router.get(
  "/",
  authMiddleware.authorize("User:read:all"), // Check if user has permission to read all
  userController.getAllUsers
);
router.get(
  "/export",
  authMiddleware.authorize("User:export"),
  userController.exportUsers
);
router.get(
  "/:id",
  authMiddleware.authorize("User:read"), // Check if user has permission to read specific user
  validation.validateMongoIdParam("id"),
  userController.getUser
);
router.put(
  "/:id/role",
  authMiddleware.authorize("User:update:role"),
  validation.validateMongoIdParam("id"),
  // Add validation for role_id in body if needed, or handle in controller
  userController.updateUserRoleAssignment
);
// router.post(
//   "/create-admin",
//   authMiddleware.authorize("User:create"), // Require permission to create users
//   validation.validatePhoneNumber, // Validate the phone number format in the body
//   userController.createAdminUser
// );
router.post(
  "/create-role-user", // New route name
  authMiddleware.authorize("User:create"),
  userController.createRoleUser // Use the new controller function
);
router.post(
  "/update-role-user",
  authMiddleware.authorize("User:create"),
  userController.updateRoleUser
);
module.exports = router;
