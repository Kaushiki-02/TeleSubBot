// middleware/validationMiddleware.js
const { body, param, query, validationResult } = require("express-validator");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param || "unknown", // Use path (body/query) or param (url)
      message: err.msg,
    }));

    const errorMessage =
      "Invalid input: " +
      formattedErrors.map((err) => `${err.field} (${err.message})`).join("; ");

    return next(new AppError(errorMessage, 400));
  }
  next();
};

// --- Common Validation Rules ---

const isMongoId = (paramName = "id") =>
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format.`);

const isKeyParam = (paramName = "key") => [
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required.`)
    .isString()
    .withMessage(`${paramName} must be a string.`)
    .trim(),
];

// --- Define Validation Rule Sets ---

exports.validatePhoneNumber = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^\d{10}$/)
    .withMessage("Invalid phone number format (e.g., 1234567890)."),
  body("role")
    .notEmpty()
    .withMessage("Role is required.")
    .isIn(["User"])
    .withMessage("Invalid role for OTP request."),
  handleValidationErrors,
];

exports.validateOtpVerification = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required for OTP verification.")
    .matches(/^\d{10}$/)
    .withMessage("Invalid phone number format."),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required.")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits.")
    .isNumeric()
    .withMessage("OTP must contain only digits."),
  body("role")
    .notEmpty()
    .withMessage("Role is required.")
    .isIn(["User"])
    .withMessage("Invalid role for OTP verification."),
  // --- END ADDED ---
  handleValidationErrors,
];

exports.validateSuperAdminLogin = [
  body("loginId")
    .trim()
    .notEmpty()
    .withMessage("Login ID is required.")
    .isString()
    .withMessage("Login ID must be a string."),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isString()
    .withMessage("Password must be a string."),
  handleValidationErrors,
];

exports.validatePasswordLogin = [
  body("loginId")
    .trim()
    .notEmpty()
    .withMessage("Login ID is required.")
    .isString()
    .withMessage("Login ID must be a string."),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isString()
    .withMessage("Password must be a string."),
  handleValidationErrors,
];

exports.validateKyc = [
  body("pan_number")
    .notEmpty()
    .withMessage("PAN number is required.")
    .isString()
    .withMessage("PAN must be a string.")
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage("Invalid PAN format (e.g., ABCDE1234F)."),
  body("aadhar_number")
    .notEmpty()
    .withMessage("Aadhar number is required.")
    .isString()
    .withMessage("Aadhar must be a string.")
    .trim()
    .matches(/^\d{12}$/)
    .withMessage("Invalid Aadhar format (must be 12 digits)."),
  handleValidationErrors,
];

// --- Plan Validations ---
exports.validateCreatePlan = [
  body("name")
    .notEmpty()
    .withMessage("Plan name is required.")
    .trim()
    .isString()
    .withMessage("Plan name must be a string."),
  body("discounted_price")
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage("Discounted price must be a number.")
    .toFloat()
    .isFloat({ min: 0 })
    .withMessage("Discounted price cannot be negative."),
  body("validity_days")
    .isInt({ min: 1 })
    .withMessage("Validity must be an integer of at least 1 day."),
  body("markup_price")
    .isNumeric()
    .withMessage("Markup price must be a number.")
    .toFloat()
    .isFloat({ min: 0 })
    .withMessage("Markup price cannot be negative."),
  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Description must be a string.")
    .trim(),
  body("channel_id").isMongoId().withMessage("Valid Channel ID is required."),
  handleValidationErrors,
];

exports.validateUpdatePlan = [
  body("name")
    .optional()
    .trim()
    .isString()
    .withMessage("Plan name must be a string."),
  body("discounted_price")
    .optional()
    .isNumeric()
    .withMessage("Discounted price must be a number.")
    .toFloat()
    .isFloat({ min: 0 })
    .withMessage("Discounted price cannot be negative."),
  body("validity_days")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Validity must be an integer of at least 1 day."),
  body("markup_price")
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage("Markup price must be a number.")
    .toFloat()
    .isFloat({ min: 0 })
    .withMessage("Markup price cannot be negative."),
  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Description must be a string.")
    .trim(),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean."),
  body("reminder_template_override_id")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid Reminder Template ID format for override."),
  body("reminder_days_override")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Reminder days override must be a non-negative integer."),
  handleValidationErrors,
];

// --- Channel Validations ---
exports.validateCreateChannel = [
  body("name")
    .notEmpty()
    .withMessage("Channel name is required.")
    .trim()
    .isString()
    .withMessage("Channel name must be a string."),
  body("telegram_chat_id")
    .notEmpty()
    .withMessage("Telegram Chat ID is required.")
    .trim()
    .isString()
    .withMessage("Telegram Chat ID must be a string."),
  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Description must be a string.")
    .trim(),
  body("reminder_template_override_id")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid Reminder Template ID format for override."),
  body("reminder_days_override")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Reminder days override must be a non-negative integer."),

  handleValidationErrors,
];

exports.validateUpdateChannel = [
  body("name")
    .optional()
    .trim()
    .isString()
    .withMessage("Channel name must be a string."),
  body("telegram_chat_id")
    .optional()
    .trim()
    .isString()
    .withMessage("Telegram Chat ID must be a string."),
  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Description must be a string.")
    .trim(),
  body("associated_plan_ids")
    .optional()
    .isArray()
    .withMessage("Associated plans must be an array of IDs."),
  body("associated_plan_ids.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid Plan ID format in the associated plans list."),
  body("reminder_template_override_id")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid Reminder Template ID format for override."),
  body("reminder_days_override")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Reminder days override must be a non-negative integer."),
  handleValidationErrors,
];

// --- Link Validations ---
exports.validateCreateLink = [
  body("name")
    .notEmpty()
    .withMessage("Link name is required.")
    .trim()
    .isString()
    .withMessage("Link name must be a string."),
  body("channel_id").isMongoId().withMessage("Valid Channel ID is required."),
  body("url_slug")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("URL slug must be a string.")
    .trim()
    .isSlug()
    .withMessage(
      "URL slug must be a valid slug format (alphanumeric characters and hyphens)."
    ),
  body("campaign_tag")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Campaign tag must be a string.")
    .trim(),
  body("expires_at")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid expiration date format (use ISO 8601)."),
  body("usage_cap")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Usage cap must be an integer greater than 0."),
  handleValidationErrors,
];

// --- Transaction Validations ---
exports.validateCreateTransactionOrder = [
  body("plan_id").isMongoId().withMessage("Valid Plan ID is required."),
  body("link_slug")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Link slug must be a string.")
    .trim(),

  handleValidationErrors,
];

exports.validateVerifyTransaction = [
  body("razorpay_payment_id")
    .notEmpty()
    .withMessage("Razorpay Payment ID is required.")
    .isString()
    .withMessage("Razorpay Payment ID must be a string.")
    .trim(),
  body("razorpay_order_id")
    .notEmpty()
    .withMessage("Razorpay Order ID is required.")
    .isString()
    .withMessage("Razorpay Order ID must be a string.")
    .trim(),
  body("razorpay_signature")
    .notEmpty()
    .withMessage("Razorpay Signature is required.")
    .isString()
    .withMessage("Razorpay Signature must be a string.")
    .trim(),
  handleValidationErrors,
];

// --- Subscription Validations ---
exports.validateExtendSubscription = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Subscription ID format in URL parameter."),
  body("extension_days")
    .isInt({ min: 1 })
    .withMessage("Extension days must be an integer of at least 1."),
  handleValidationErrors,
];

exports.validateBulkExtendSubscription = [
  body("subscription_ids")
    .isArray({ min: 1 })
    .withMessage("Subscription IDs must be provided as a non-empty array."),
  body("subscription_ids.*") // Wildcard for array items
    .isMongoId()
    .withMessage("Invalid Subscription ID format found in the array."),
  body("extension_days")
    .notEmpty()
    .withMessage("Extension days is required.")
    .isInt({ min: 1 })
    .withMessage("Extension days must be a positive integer."),
  handleValidationErrors,
];

exports.validateSubscriptionUpgrade = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Subscription ID format in URL parameter."),
  body("new_plan_id")
    .notEmpty()
    .withMessage("New plan ID is required.")
    .isMongoId()
    .withMessage("Valid New Plan ID is required in the request body."),
  handleValidationErrors,
];

// --- FAQ Validations ---
exports.validateCreateFAQ = [
  body("question")
    .notEmpty()
    .withMessage("FAQ question is required.")
    .trim()
    .isString()
    .withMessage("Question must be a string."),
  body("answer")
    .notEmpty()
    .withMessage("FAQ answer is required.")
    .trim()
    .isString()
    .withMessage("Answer must be a string."),
  body("display_order")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Display order must be a non-negative integer."),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false."),
  body("language")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Language must be a string.")
    .trim()
    .toLowerCase(),
  handleValidationErrors,
];

exports.validateUpdateFAQ = [
  body("question")
    .optional()
    .trim()
    .isString()
    .withMessage("Question must be a string."),
  body("answer")
    .optional()
    .trim()
    .isString()
    .withMessage("Answer must be a string."),
  body("display_order")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Display order must be a non-negative integer."),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false."),
  body("language")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Language must be a string.")
    .trim()
    .toLowerCase(),
  handleValidationErrors,
];

// --- Reminder Template Validations ---
exports.validateCreateReminderTemplate = [
  body("name")
    .notEmpty()
    .withMessage("Template name is required.")
    .trim()
    .isString()
    .withMessage("Template name must be a string."),
  body("content")
    .notEmpty()
    .withMessage("Template content is required.")
    .trim()
    .isString()
    .withMessage("Template content must be a string."),
  body("type")
    .isIn(["pre-expiry", "custom"])
    .withMessage("Invalid template type. Must be 'pre-expiry' or 'custom'."),
  body("days_before_expiry")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Days before expiry must be a non-negative integer.")
    .custom((value, { req }) => {
      // Require days_before_expiry only if type is 'pre-expiry'
      if (
        req.body.type === "pre-expiry" &&
        (value === undefined || value === null || value < 0)
      ) {
        throw new Error(
          "Days before expiry is required and must be non-negative for pre-expiry templates."
        );
      }
      return true;
    }),
  body("is_default")
    .optional()
    .isBoolean()
    .withMessage("is_default must be boolean."),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean."),
  handleValidationErrors,
];

exports.validateUpdateReminderTemplate = [
  body("name")
    .optional()
    .trim()
    .isString()
    .withMessage("Template name must be a string."),
  body("content")
    .optional()
    .trim()
    .isString()
    .withMessage("Template content must be a string."),
  // Type cannot be updated, so no validation here
  body("days_before_expiry")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Days before expiry must be a non-negative integer."),
  body("is_default")
    .optional()
    .isBoolean()
    .withMessage("is_default must be boolean."),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean."),
  handleValidationErrors,
];

// --- Role & Permission Validations ---
exports.validateCreateRole = [
  body("name")
    .notEmpty()
    .withMessage("Role name is required.")
    .trim()
    .isString()
    .withMessage("Role name must be a string."),
  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Description must be a string.")
    .trim(),
  body("permissionIds")
    .optional()
    .isArray()
    .withMessage("permissionIds must be an array of IDs."),
  body("permissionIds.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid Permission ID format in the list."),
  handleValidationErrors,
];

exports.validateUpdateRole = [
  body("name")
    .optional()
    .trim()
    .isString()
    .withMessage("Role name must be a string."),
  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Description must be a string.")
    .trim(),
  body("permissionIds")
    .optional()
    .isArray()
    .withMessage("permissionIds must be an array of IDs."),
  body("permissionIds.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid Permission ID format in the list."),
  handleValidationErrors,
];

exports.validateAssignPermissions = [
  param("roleId")
    .isMongoId()
    .withMessage("Invalid Role ID format in URL parameter."),
  body("permissionIds")
    .isArray()
    .withMessage("permissionIds must be an array.")
    .custom((value) => value.every(mongoose.Types.ObjectId.isValid)) // Custom check for all items
    .withMessage("All items in permissionIds must be valid Mongo Object IDs."),
  handleValidationErrors,
];

// --- Setting Validations ---
exports.validateUpsertSetting = [
  // Validate 'key' only if it's in the body (for POST)
  body("key")
    .if((value, { req }) => req.method === "POST") // Apply subsequent checks only for POST
    .notEmpty()
    .withMessage("Setting key is required in request body for POST.")
    .isString()
    .withMessage("Setting key must be a string.")
    .trim(),

  body("value").exists().withMessage("Setting value is required."), // Value always required

  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Description must be a string.")
    .trim(),
  body("type")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Type must be a string.")
    .trim(),

  // Custom check for PUT: If body key is provided, it must match URL param key
  body("key")
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      if (req.method === "PUT" && req.params.key && value !== req.params.key) {
        throw new Error(
          "Setting key in body does not match key in URL parameter."
        );
      }
      return true;
    }),
  handleValidationErrors,
];

// --- User Validations ---
exports.validateLinkTelegram = [
  body("telegram_username")
    .notEmpty()
    .withMessage("Telegram username is required.")
    .isString()
    .withMessage("Telegram username must be a string.")
    .trim()
    .matches(/^@[a-zA-Z0-9_]{5,32}$/)
    .withMessage(
      "Invalid Telegram username format. Must start with '@' and be 5-32 alphanumeric chars/underscores."
    ),
  handleValidationErrors,
];

// --- Parameter Validations ---
exports.validateMongoIdParam = (paramName = "id") => [
  isMongoId(paramName),
  handleValidationErrors,
];

exports.validateKeyParam = (paramName = "key") => [
  ...isKeyParam(paramName), // Spread the array returned by isKeyParam
  handleValidationErrors,
];
