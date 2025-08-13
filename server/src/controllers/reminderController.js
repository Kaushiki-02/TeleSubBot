// controllers/reminderController.js
const ReminderTemplate = require("../models/ReminderTemplate");
const Reminder = require("../models/Reminder");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const crypto = require("crypto");

// --- Reminder Templates ---

// Requires 'ReminderTemplate:create'
exports.createReminderTemplate = catchAsync(async (req, res, next) => {
  const { name, content, type, days_before_expiry, is_default, is_active } =
    req.body;

  if (
    type === "pre-expiry" &&
    (days_before_expiry === undefined ||
      days_before_expiry === null ||
      days_before_expiry < 0)
  ) {
    return next(
      new AppError(
        "Days before expiry is required and must be non-negative for pre-expiry templates.",
        400
      )
    );
  }

  if (is_default && type === "pre-expiry") {
    if (
      await ReminderTemplate.findOne({ type: "pre-expiry", is_default: true })
    ) {
      return next(
        new AppError(
          "Another template is already the default pre-expiry template.",
          400
        )
      );
    }
  }

  const newTemplate = await ReminderTemplate.create(req.body);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "REMINDER_TEMPLATE_CREATED",
    target_type: "ReminderTemplate",
    target_id: newTemplate._id,
    description: `Reminder template '${name}' created.`,
  });
  res.status(201).json({ status: "success", data: { template: newTemplate } });
});

// Requires 'ReminderTemplate:read'
exports.getAllReminderTemplates = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(ReminderTemplate.find(), req.query)
    .filter()
    .sort("name")
    .limitFields()
    .paginate();
  const templates = await features.query;
  res.status(200).json({
    status: "success",
    results: templates.length,
    data: { templates },
  });
});

// Requires 'ReminderTemplate:read'
exports.getReminderTemplate = catchAsync(async (req, res, next) => {
  const template = await ReminderTemplate.findById(req.params.id);
  if (!template) return next(new AppError("Reminder template not found.", 404));
  res.status(200).json({ status: "success", data: { template } });
});

// Requires 'ReminderTemplate:update'
exports.updateReminderTemplate = catchAsync(async (req, res, next) => {
  const templateId = req.params.id;
  // Explicitly select fields allowed for update
  const { name, content, days_before_expiry, is_default, is_active } = req.body;
  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (content !== undefined) updateData.content = content;
  if (days_before_expiry !== undefined)
    updateData.days_before_expiry = days_before_expiry;
  if (is_active !== undefined) updateData.is_active = is_active;

  const currentTemplate = await ReminderTemplate.findById(templateId);
  if (!currentTemplate)
    return next(new AppError("Reminder template not found.", 404));
  // Type cannot be changed
  updateData.type = currentTemplate.type;

  // Check conditional logic for days_before_expiry if type is pre-expiry
  if (updateData.type === "pre-expiry") {
    const finalDays =
      updateData.days_before_expiry !== undefined
        ? updateData.days_before_expiry
        : currentTemplate.days_before_expiry;
    if (finalDays === undefined || finalDays === null || finalDays < 0) {
      return next(
        new AppError(
          "Days before expiry is required and must be non-negative for pre-expiry templates.",
          400
        )
      );
    }
    updateData.days_before_expiry = finalDays; // Ensure it's set
  } else {
    // For 'custom' type, days_before_expiry is irrelevant/ignored by model validation
    delete updateData.days_before_expiry; // Remove if present in request for custom type
    updateData.is_default = false; // Custom templates cannot be default
  }

  // Handle is_default logic only for pre-expiry
  if (updateData.type === "pre-expiry" && is_default !== undefined) {
    if (is_default === true) {
      // If setting this one to default, unset others of the same type
      await ReminderTemplate.updateMany(
        { type: "pre-expiry", is_default: true, _id: { $ne: templateId } },
        { $set: { is_default: false } }
      );
      updateData.is_default = true;
    } else {
      // If unsetting this one, ensure it's not the *only* default one (optional check)
      updateData.is_default = false;
    }
  } else if (is_default !== undefined && updateData.type !== "pre-expiry") {
    // Prevent setting default=true on non-pre-expiry types
    updateData.is_default = false;
  }

  const updatedTemplate = await ReminderTemplate.findByIdAndUpdate(
    templateId,
    updateData,
    { new: true, runValidators: true }
  );
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "REMINDER_TEMPLATE_UPDATED",
    target_type: "ReminderTemplate",
    target_id: updatedTemplate._id,
    description: `Reminder template '${updatedTemplate.name}' updated.`,
  });
  res
    .status(200)
    .json({ status: "success", data: { template: updatedTemplate } });
});

// Requires 'ReminderTemplate:delete'
exports.deleteReminderTemplate = catchAsync(async (req, res, next) => {
  const template = await ReminderTemplate.findByIdAndDelete(req.params.id);
  if (!template) return next(new AppError("Reminder template not found.", 404));
  if (template.is_default && template.type === "pre-expiry") {
    console.warn(
      `Deleted default template: ${template.name}. Consider setting another template as default.`
    );
  }
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "REMINDER_TEMPLATE_DELETED",
    target_type: "ReminderTemplate",
    target_id: req.params.id,
    description: `Reminder template '${template.name}' deleted.`,
  });
  res.status(204).json({ status: "success", data: null });
});

// --- Delivery Reports ---

// Requires 'Reminder:read'
exports.getDeliveryReports = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Reminder.find()
      .populate("user_id", "phone")
      .populate("subscription_id", "end_date")
      .populate("channel_id", "name"),
    req.query
  )
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate();
  const reports = await features.query;
  res
    .status(200)
    .json({ status: "success", results: reports.length, data: { reports } });
});

// --- Webhook Handler --- (Public, verify source)
exports.handleWhatsAppStatusWebhook = catchAsync(async (req, res, next) => {
  console.log("WhatsApp Webhook Body:", JSON.stringify(req.body));
  // TODO: Add webhook signature verification (depends on provider)

  const messageSid = req.body.MessageSid;
  const messageStatus = req.body.MessageStatus;
  const errorCode = req.body.ErrorCode;
  const errorMessage = req.body.ErrorMessage;

  if (!messageSid || !messageStatus)
    return res
      .status(400)
      .json({ status: "error", message: "Missing fields." });

  const reminder = await Reminder.findOne({ message_sid: messageSid });
  if (!reminder) {
    console.log(`Webhook: Reminder with SID ${messageSid} not found.`);
    return res.status(200).json({ status: "ok", message: "SID not found." }); // Respond OK even if not found
  }

  const statusHierarchy = {
    pending: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    failed: 4,
  };
  const currentStatusLevel = statusHierarchy[reminder.status] ?? 0;
  const newStatusLevel = statusHierarchy[messageStatus] ?? -1;

  if (newStatusLevel > currentStatusLevel || messageStatus === "failed") {
    reminder.status = messageStatus;
    reminder.last_status_update_at = new Date();
    if (messageStatus === "failed") {
      reminder.failure_reason = `Code ${errorCode}: ${errorMessage}`;
    }
    await reminder.save({ validateModifiedOnly: true });
    logger.logAction({
      actor_type: "System",
      action_type: `WHATSAPP_STATUS_${messageStatus.toUpperCase()}`,
      target_type: "Reminder",
      target_id: reminder._id,
      description: `WA status for ${messageSid}: ${messageStatus}.`,
    });
  }
  res.status(200).json({ status: "ok" });
});
