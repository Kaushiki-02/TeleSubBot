// controllers/settingController.js
const Setting = require("../models/Setting");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

// Get all settings (Requires 'Setting:read')
exports.getAllSettings = catchAsync(async (req, res, next) => {
  // Permission check done by middleware: authorize('Setting:read')
  const settings = await Setting.find().sort("key");
  res
    .status(200)
    .json({ status: "success", results: settings.length, data: { settings } });
});

// Get a specific setting by key (Requires 'Setting:read')
exports.getSetting = catchAsync(async (req, res, next) => {
  // Permission check done by middleware: authorize('Setting:read')
  // Key is from URL param
  const setting = await Setting.findOne({ key: req.params.key });
  if (!setting) {
    return next(
      new AppError(`Setting with key '${req.params.key}' not found`, 404)
    );
  }
  res.status(200).json({ status: "success", data: { setting } });
});

// Create or Update a setting (Requires 'Setting:manage')
exports.upsertSetting = catchAsync(async (req, res, next) => {
  // Permission check done by middleware: authorize('Setting:manage')

  let key;
  // Get key from URL param if PUT, from body if POST
  if (req.method === "PUT") {
    key = req.params.key;
  } else if (req.method === "POST") {
    key = req.body.key;
  } else {
    // Should not happen with route definitions, but as a safeguard
    return next(new AppError("Unsupported method for upsertSetting.", 405)); // Method Not Allowed
  }

  const { value, description, type } = req.body; // Get other data from body

  if (!key || value === undefined) {
    // This validation is also done by middleware, but good to double check
    return next(new AppError("Setting key and value are required", 400));
  }

  const settingData = {
    key,
    value,
    description,
    type: type || typeof value, // Infer type if not provided
  };

  const setting = await Setting.findOneAndUpdate({ key: key }, settingData, {
    new: true,
    upsert: true, // Create if not exists
    runValidators: true, // Run model validators
    setDefaultsOnInsert: true,
  });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "SETTING_UPSERTED",
    target_type: "Setting",
    target_id: setting._id,
    description: `Setting '${key}' created/updated by ${req.user.phone}.`,
    details: { key, value },
  });

  res
    .status(req.method === "POST" ? 201 : 200) // Use 201 for POST create
    .json({ status: "success", data: { setting } });
});

// Delete a setting (Requires 'Setting:manage') - Key from URL param
exports.deleteSetting = catchAsync(async (req, res, next) => {
  // Permission check done by middleware: authorize('Setting:manage')
  // Key is from URL param
  const setting = await Setting.findOneAndDelete({ key: req.params.key });

  if (!setting) {
    return next(
      new AppError(`Setting with key '${req.params.key}' not found`, 404)
    );
  }

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "SETTING_DELETED",
    target_type: "Setting",
    target_id: setting._id,
    description: `Setting '${setting.key}' deleted by ${req.user.phone}.`,
  });

  res.status(204).json({ status: "success", data: null });
});
