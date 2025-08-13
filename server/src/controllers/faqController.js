const FAQ = require("../models/FAQ");
const Role = require("../models/Role");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");

// Create FAQ (Requires 'FAQ:manage' permission)
exports.createFAQ = catchAsync(async (req, res, next) => {
  const { question, answer, display_order, is_active, language } = req.body;
  const newFAQ = await FAQ.create({
    question,
    answer,
    display_order,
    is_active,
    language,
    created_by: req.user._id,
  });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "FAQ_CREATED",
    target_type: "FAQ",
    target_id: newFAQ._id,
    description: `FAQ '${question.substring(0, 30)}...' created.`,
    details: { question, language },
  });
  res.status(201).json({ status: "success", data: { faq: newFAQ } });
});

// Get All FAQs (Management - Requires 'FAQ:read' permission)
exports.getAllFAQs = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    FAQ.find().populate("created_by", "phone").populate("updated_by", "phone"),
    req.query
  )
    .filter()
    .sort("display_order question")
    .limitFields()
    .paginate();
  const faqs = await features.query;
  res
    .status(200)
    .json({ status: "success", results: faqs.length, data: { faqs } });
});

// Get Active FAQs (Public)
exports.getActiveFAQs = catchAsync(async (req, res, next) => {
  const language = req.query.lang || "en";
  const faqs = await FAQ.find({ is_active: true, language: language })
    .sort("display_order question")
    .select("question answer");
  res
    .status(200)
    .json({ status: "success", results: faqs.length, data: { faqs } });
});

// Get Single FAQ (Management - Requires 'FAQ:read')
exports.getFAQ = catchAsync(async (req, res, next) => {
  const faq = await FAQ.findById(req.params.id)
    .populate("created_by", "phone")
    .populate("updated_by", "phone");
  if (!faq) return next(new AppError("FAQ not found", 404));
  res.status(200).json({ status: "success", data: { faq } });
});

// Update FAQ (Requires 'FAQ:manage' permission)
exports.updateFAQ = catchAsync(async (req, res, next) => {
  // Explicitly select fields allowed for update
  const allowedUpdates = {};
  if (req.body.question !== undefined)
    allowedUpdates.question = req.body.question;
  if (req.body.answer !== undefined) allowedUpdates.answer = req.body.answer;
  if (req.body.display_order !== undefined)
    allowedUpdates.display_order = req.body.display_order;
  if (req.body.is_active !== undefined)
    allowedUpdates.is_active = req.body.is_active;
  if (req.body.language !== undefined)
    allowedUpdates.language = req.body.language;

  allowedUpdates.updated_by = req.user._id;

  const faq = await FAQ.findByIdAndUpdate(req.params.id, allowedUpdates, {
    new: true,
    runValidators: true,
  })
    .populate("created_by", "phone")
    .populate("updated_by", "phone");

  if (!faq) return next(new AppError("FAQ not found", 404));

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "FAQ_UPDATED",
    target_type: "FAQ",
    target_id: faq._id,
    description: `FAQ '${faq.question.substring(0, 30)}...' updated.`,
    details: { changes: allowedUpdates },
  });
  res.status(200).json({ status: "success", data: { faq } });
});

// Delete FAQ (Requires 'FAQ:manage' permission)
exports.deleteFAQ = catchAsync(async (req, res, next) => {
  const faq = await FAQ.findByIdAndDelete(req.params.id);
  if (!faq) return next(new AppError("FAQ not found", 404));

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "FAQ_DELETED",
    target_type: "FAQ",
    target_id: req.params.id,
    description: `FAQ '${faq.question.substring(0, 30)}...' deleted.`,
  });
  res.status(204).json({ status: "success", data: null });
});
