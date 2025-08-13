// routes/authRoutes.js
const express = require("express");
const authController = require("../controllers/authController");
const validation = require("../middleware/validationMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// OTP login for User role
router.post(
  "/otp/request",
  validation.validatePhoneNumber, // This validator checks role is 'User'
  authController.requestOtp
);
router.post(
  "/otp/verify",
  validation.validateOtpVerification, // This validator checks role is 'User'
  authController.verifyOtp
);

// Password login for Admin, Sales, Support, SuperAdmin roles
router.post(
  "/login/password",
  validation.validatePasswordLogin,
  authController.loginPassword
);


router.post("/logout", authMiddleware.protect, authController.logout);

module.exports = router;
