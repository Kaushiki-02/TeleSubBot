// src/controllers/planController.js
const Plan = require("../models/Plan");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const Channel = require("../models/Channel");
const User = require("../models/User");
const mongoose = require("mongoose");

// Create Plan (Requires 'Plan:create' permission)
exports.createPlan = catchAsync(async (req, res, next) => {
  const {
    name,
    markup_price,
    discounted_price,
    validity_days,
    description,
    channel_id,
    is_active,
  } = req.body;
  const currentUser = req.user;

  // Admins can only assign plans to channels they manage (owned)
  if (currentUser.role_id.name === "Admin") {
    const hasAccess = await Channel.exists({
      _id: channel_id,
      owner: currentUser._id,
    });
    if (!hasAccess) {
      return next(new AppError("Channel not found or access denied", 403));
    }
  }
  // SuperAdmin can assign to any channel
  if (currentUser.role_id.name === "SuperAdmin") {
    const channelExists = await Channel.exists({ _id: channel_id });
    if (!channelExists) {
      return next(new AppError("Channel not found.", 404));
    }
  }
  // Other roles (Sales, Support, User) cannot create plans (permission middleware handles this)

  // Price validation
  if (
    markup_price !== undefined &&
    markup_price !== null &&
    discounted_price !== undefined &&
    markup_price < discounted_price
  ) {
    return next(
      new AppError("Markup price cannot be less than discounted price.", 400)
    );
  }

  // Create the plan
  const newPlanData = {
    name,
    markup_price,
    validity_days,
    description,
    channel_id,
    is_active: is_active !== undefined ? is_active : true,
  };
  if (discounted_price !== undefined) {
    newPlanData.discounted_price = discounted_price;
  }
  const newPlan = await Plan.create(newPlanData);

  // Add plan to the channel's associated_plan_ids array
  const channel = await Channel.findByIdAndUpdate(channel_id, {
    $push: { associated_plan_ids: newPlan._id },
  });

  // If channel update failed, it means the channel_id didn't exist or user didn't have permission
  if (!channel) {
    // console.error("Failed to link plan to channel during creation, but plan was created.");
    // return next(new AppError("Failed to associate plan with channel.", 500));
  }

  // Log the action
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "PLAN_CREATED",
    target_type: "Plan",
    target_id: newPlan._id,
    description: `Plan '${newPlan.name}' created and linked to channel '${channel_id}'. Active: ${newPlan.is_active}.`,
  });

  res.status(201).json({ status: "success", data: { plan: newPlan } });
});

// Get All Plans (Requires 'Plan:read' permission)
exports.getAllPlans = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  const baseFilter = {};
  let populationOptions = [];

  if (currentUser.role_id.name === "Admin") {
    const adminChannels = await Channel.find({ owner: currentUser._id }).select(
      "_id"
    );
    const adminChannelIds = adminChannels.map((c) => c._id);
    baseFilter.channel_id = { $in: adminChannelIds };
    populationOptions.push({ path: "channel_id", select: "name" });
  } else if (currentUser.role_id.name === "SuperAdmin") {
    const { channelId } = req.query; // Get channelId from query parameters
    if (channelId) {
      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        return next(new AppError("Invalid channelId format in query.", 400));
      }
      baseFilter.channel_id = channelId;
    }
    populationOptions.push({
      path: "channel_id",
      select: "name owner",
      populate: { path: "owner", select: "phone name loginId" },
    });
  } else {
    return next(new AppError("Access Denied", 403));
  }

  let query = Plan.find(baseFilter); // Apply baseFilter directly to Mongoose query

  if (populationOptions.length > 0) {
    query = query.populate(populationOptions);
  }

  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const plans = await features.query;

  const finalCountFilter = features.query.getFilter();
  const totalCount = await Plan.countDocuments(finalCountFilter);

  res.status(200).json({
    status: "success",
    results: plans.length,
    total: totalCount,
    data: { plans },
  });
});

// Get plans associated with the specific channel ID (Requires 'Plan:read')
exports.getPlansByChannel = catchAsync(async (req, res, next) => {
  const { channelId } = req.params;
  const currentUser = req.user;

  // Check if the current user (non-SuperAdmin) has access to this channel
  if (currentUser.role_id.name !== "SuperAdmin") {
    const hasAccess = await Channel.exists({
      _id: channelId,
      owner: currentUser._id,
    });
    if (!hasAccess) {
      return next(new AppError("Channel not found or access denied", 404));
    }
  }
  // SuperAdmin can access plans for any channel

  // Fetch plans for this channel.
  const features = new APIFeatures(
    Plan.find({ channel_id: channelId }),
    req.query
  )
    .filter() //  filters like ?is_active=true
    .sort({
      markup_price: 1, // Default sort by price
    })
    .limitFields()
    .paginate();

  const plans = await features.query;

  res.status(200).json({
    status: "success",
    results: plans.length,
    data: { plans },
  });
});

// Get Single Plan (Requires 'Plan:read')
exports.getPlan = catchAsync(async (req, res, next) => {
  const planId = req.params.id;
  const currentUser = req.user;

  console.log(planId);
  let planQuery = Plan.findById(planId);

  const plan = await planQuery;

  if (!plan) return next(new AppError("Plan not found", 404));
  console.log(plan);

  // Check if the current user (non-SuperAdmin) has access to the channel this plan belongs to
  if (currentUser.role_id.name !== "SuperAdmin") {
    if (!plan.channel_id) {
      // Orphaned plan, access denied for non-SuperAdmins
      return next(new AppError("Plan not found or access denied", 404));
    }
    console.log(plan.channel_id, currentUser._id);
    const hasAccess = await Channel.exists({
      _id: plan.channel_id,
      owner: currentUser._id,
    });
    if (!hasAccess) {
      return next(new AppError("Plan not found or access denied", 404));
    }
  }
  // SuperAdmin has access to any plan

  res.status(200).json({ status: "success", data: { plan } });
});

// Update Plan (Requires 'Plan:update' permission)
exports.updatePlan = catchAsync(async (req, res, next) => {
  const {
    name,
    markup_price,
    discounted_price,
    validity_days,
    description,
    is_active,
  } = req.body;
  const updateData = {};
  const planId = req.params.id;
  const currentUser = req.user;

  // Find the current plan first to check access and current values
  const currentPlan = await Plan.findById(planId);
  if (!currentPlan) return next(new AppError("Plan not found", 404));

  // Check if the current user (non-SuperAdmin) has access to the channel this plan belongs to
  if (currentUser.role_id.name !== "SuperAdmin") {
    if (!currentPlan.channel_id) {
      // Orphaned plan, update denied for non-SuperAdmins
      return next(new AppError("Plan not found or access denied", 404));
    }
    const hasAccess = await Channel.exists({
      _id: currentPlan.channel_id,
      owner: currentUser._id,
    });
    if (!hasAccess) {
      return next(new AppError("Plan not found or access denied", 404));
    }
  }
  // SuperAdmin has access to update any plan

  // Populate updateData only with fields present in req.body
  if (name !== undefined) updateData.name = name;
  if (validity_days !== undefined) updateData.validity_days = validity_days;
  if (description !== undefined)
    updateData.description = description === "" ? null : description;
  if (is_active !== undefined) updateData.is_active = is_active;

  // Handle price updates - use current value if not provided in body
  const newDiscountedPrice =
    discounted_price !== undefined ? discounted_price : undefined;
  const newMarkupPrice =
    markup_price !== undefined ? markup_price : currentPlan.markup_price;

  // Validation
  if (newDiscountedPrice !== undefined && newDiscountedPrice < 0) {
    return next(new AppError("Discounted price cannot be negative.", 400));
  }
  if (
    newMarkupPrice !== undefined &&
    newMarkupPrice !== null &&
    newMarkupPrice < 0
  ) {
    return next(new AppError("Markup price cannot be negative.", 400));
  }
  if (
    newMarkupPrice !== null &&
    newDiscountedPrice !== undefined &&
    newDiscountedPrice >= newMarkupPrice
  ) {
    return next(
      new AppError("Discounted price must be less than markup price.", 400)
    );
  }

  // Update values
  if (discounted_price !== undefined) {
    updateData.discounted_price = discounted_price;
  } else {
    updateData.$unset = { ...(updateData.$unset || {}), discounted_price: "" };
  }

  if (markup_price !== undefined) {
    updateData.markup_price =
      markup_price === null || markup_price === "" ? null : markup_price;
  }

  const updatedPlan = await Plan.findByIdAndUpdate(planId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedPlan)
    return next(new AppError("Plan not found after update attempt.", 404));

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "PLAN_UPDATED",
    target_type: "Plan",
    target_id: updatedPlan._id,
    description: `Plan '${updatedPlan.name}' updated. Active: ${updatedPlan.is_active}.`,
    details: { changes: updateData },
  });
  res.status(200).json({ status: "success", data: { plan: updatedPlan } });
});

// Deactivate Plan (Soft Delete - Requires 'Plan:delete' permission)
exports.deactivatePlan = catchAsync(async (req, res, next) => {
  const planId = req.params.id;
  const currentUser = req.user;

  // Find the plan first to check access
  const plan = await Plan.findById(planId);
  if (!plan) return next(new AppError("Plan not found", 404));

  // Check if the current user (non-SuperAdmin) has access to the channel this plan belongs to
  if (currentUser.role_id.name !== "SuperAdmin") {
    if (!plan.channel_id) {
      // Orphaned plan, update denied for non-SuperAdmins
      return next(new AppError("Plan not found or access denied", 404));
    }
    const hasAccess = await Channel.exists({
      _id: plan.channel_id,
      owner: currentUser._id,
    });
    if (!hasAccess) {
      return next(new AppError("Plan not found or access denied", 404));
    }
  }
  // SuperAdmin has access to deactivate any plan

  if (!plan.is_active) {
    return res.status(200).json({
      status: "success",
      message: "Plan is already inactive.",
      data: { plan },
    });
  }

  // Perform the soft delete
  plan.is_active = false;
  await plan.save({ validateBeforeSave: true }); // Re-run validators

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "PLAN_DEACTIVATED",
    target_type: "Plan",
    target_id: plan._id,
    description: `Plan '${plan.name}' deactivated.`,
  });
  res.status(200).json({
    status: "success",
    message: "Plan deactivated successfully.",
    data: { plan },
  });
});

// Activate Plan (Requires 'Plan:update' permission)
exports.activatePlan = catchAsync(async (req, res, next) => {
  const planId = req.params.id;
  const currentUser = req.user;

  // Find the plan first to check access
  const plan = await Plan.findById(planId);
  if (!plan) return next(new AppError("Plan not found", 404));

  // Check if the current user (non-SuperAdmin) has access to the channel this plan belongs to
  if (currentUser.role_id.name !== "SuperAdmin") {
    if (!plan.channel_id) {
      // Orphaned plan, update denied for non-SuperAdmins
      return next(new AppError("Plan not found or access denied", 404));
    }
    const hasAccess = await Channel.exists({
      _id: plan.channel_id,
      owner: currentUser._id,
    });
    if (!hasAccess) {
      return next(new AppError("Plan not found or access denied", 404));
    }
  }
  // SuperAdmin has access to activate any plan

  if (plan.is_active) {
    return res.status(200).json({
      status: "success",
      message: "Plan is already active.",
      data: { plan },
    });
  }

  // Perform the activation
  plan.is_active = true;
  await plan.save({ validateBeforeSave: true });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "PLAN_ACTIVATED",
    target_type: "Plan",
    target_id: plan._id,
    description: `Plan '${plan.name}' activated.`,
  });
  res.status(200).json({
    status: "success",
    message: "Plan activated successfully.",
    data: { plan },
  });
});

exports.deletePlan = catchAsync(async (req, res, next) => {
  const planId = req.params.id;
  const currentUser = req.user;

  // Find the plan first to check access
  const plan = await Plan.findById(planId);
  if (!plan) return next(new AppError("Plan not found", 404));

  // Check if the current user (non-SuperAdmin) has access to the channel this plan belongs to
  if (currentUser.role_id.name !== "SuperAdmin") {
    if (!plan.channel_id) {
      // Orphaned plan, update denied for non-SuperAdmins
      return next(new AppError("Plan not found or access denied", 404));
    }
    const hasAccess = await Channel.exists({
      _id: plan.channel_id,
      owner: currentUser._id,
    });
    if (!hasAccess) {
      return next(new AppError("Plan not found or access denied", 404));
    }
  }
  // SuperAdmin has access to delete any plan

  // Delete plan and remove it from channel
  // await Plan.deleteOne({ _id: plan._id }); // Correctly deletes the plan document

  // Remove plan from channel
  await Channel.updateOne(
    { _id: plan.channel_id },
    { $pull: { associated_plan_ids: plan._id } }
  );

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "PLAN_DELETED",
    target_type: "Plan",
    target_id: plan._id,
    description: `Plan '${plan.name}' deleted.`,
  });
  res.status(200).json({
    status: "success",
    message: "Plan deleted successfully.",
  });
});

// Helper function to check if a user has access to a channel/plan
// LATER to implement DONOTDELETE
// const userHasChannelAccess = async (userId, channelId) => {
//   const user = await User.findById(userId);
//   if (!user) return false; // User not found

//   if (user.role_id.name === "SuperAdmin") return true; // SuperAdmin has full access

//   // Check if the user owns the channel (assuming 'owner' field in Channel)
//   const channel = await Channel.findById(channelId);
//   if (!channel || !channel.owner) return false; // Channel not found or has no owner

//   return channel.owner.equals(userId); // User owns the channel
// };
