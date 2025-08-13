// src/controllers/channelController.js

const Channel = require("../models/Channel");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

// Create Channel (Requires 'Channel:create')
exports.createChannel = catchAsync(async (req, res, next) => {
  const {
    name,
    telegram_chat_id,
    description,
    reminder_template_override_id,
    reminder_days_override,
    associated_plan_ids,
    is_active,
  } = req.body;

  const currentUser = req.user;

  if (!["Admin", "SuperAdmin"].includes(currentUser.role_id.name)) {
    return next(
      new AppError("Only Admins are allowed to create channels.", 403)
    );
  }

  if (reminder_template_override_id) {
    const ReminderTemplate = require("../models/ReminderTemplate");
    const templateExists = await ReminderTemplate.findById(
      reminder_template_override_id
    );
    if (!templateExists) {
      return next(new AppError("Reminder template override ID invalid.", 400));
    }
  }
  if (associated_plan_ids && associated_plan_ids.length > 0) {
    const validPlans = await Plan.countDocuments({
      _id: { $in: associated_plan_ids },
    });
    if (validPlans !== associated_plan_ids.length) {
      return next(
        new AppError("One or more associated plan IDs are invalid.", 400)
      );
    }
  }

  const newChannelData = {
    name,
    telegram_chat_id,
    description,
    reminder_template_override_id,
    reminder_days_override,
    associated_plan_ids: associated_plan_ids || [],
    owner: currentUser._id,
    is_active: is_active !== undefined ? is_active : true,
  };

  const newChannel = await Channel.create(newChannelData);

  if (currentUser.role_id.name === "Admin") {
    await User.findByIdAndUpdate(currentUser._id, {
      $push: { channels: newChannel._id },
    });
  }

  logger.logAction({
    actor_type: currentUser.role_id.name,
    actor_id: currentUser._id,
    action_type: "CHANNEL_CREATED",
    target_type: "Channel",
    target_id: newChannel._id,
    description: `Channel '${newChannel.name}' created by ${currentUser.phone}.`,
    details: { name, telegram_chat_id, is_active: newChannel.is_active },
  });

  res.status(201).json({ status: "success", data: { channel: newChannel } });
});

// Get All Channels (Requires 'Channel:read')
exports.getAllChannels = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  let baseQuery;

  if (currentUser.role_id.name !== "SuperAdmin") {
    baseQuery = Channel.find({ owner: currentUser._id });
  } else {
    baseQuery = Channel.find().populate("owner", "phone name").populate({
      path: "associated_plan_ids",
      select:
        "name markup_price discounted_price validity_days is_active description",
    });
  }

  const features = new APIFeatures(baseQuery, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const channels = await features.query;

  res.status(200).json({
    status: "success",
    results: channels.length,
    data: { channels },
  });
});

// Get Single Channel (Requires 'Channel:read')
exports.getChannel = catchAsync(async (req, res, next) => {
  // const currentUser = req.user; // Not strictly needed for SA context if not checking ownership
  const channelId = req.params.id;

  // For SA, always populate plans. For Admin, they only see their own channels,
  const channel = await Channel.findById(channelId)
    .populate("associated_plan_ids")
    .populate("owner", "phone name"); // Also populate owner

  if (!channel) {
    return next(new AppError("Channel not found or access denied", 404));
  }

  res.status(200).json({ status: "success", data: { channel } });
});

// Public Endpoint: Get Channel and its Active Plans by Referral Code (Public)
exports.getPublicChannelByReferralCode = catchAsync(async (req, res, next) => {
  const { referralCode } = req.params;

  if (!referralCode) {
    return next(new AppError("Referral code is required.", 400));
  }

  // Find the channel by referral code and ensure it's active
  const channel = await Channel.findOne({
    referralCode: referralCode,
    is_active: true,
  });

  if (!channel) {
    // Use 404 if not found or not active
    return next(new AppError("Channel not found or is inactive.", 404));
  }

  // Populate only the associated plans that are also active
  const populatedChannel = await Channel.populate(channel, {
    path: "associated_plan_ids",
    match: { is_active: true }, // IMPORTANT: Filter active plans
    select:
      "name is_active discounted_price markup_price validity_days description _id", // Select relevant fields
  });

  res
    .status(200)
    .json({ status: "success", data: { channel: populatedChannel } });
});

// Update Channel (Requires 'Channel:update')
exports.updateChannel = catchAsync(async (req, res, next) => {
  const {
    name,
    telegram_chat_id,
    description,
    associated_plan_ids,
    reminder_template_override_id,
    reminder_days_override,
    is_active,
    couponCode,
    couponDiscount
  } = req.body;
  const updateData = {};
  const currentUser = req.user;
  const channelId = req.params.id;

  let existingChannel;
  if (currentUser.role_id.name !== "SuperAdmin") {
    existingChannel = await Channel.findOne({
      _id: channelId,
      owner: currentUser._id,
    });
    if (!existingChannel) {
      return next(new AppError("Channel not found or access denied", 404));
    }
  }

  if (name !== undefined) updateData.name = name;
  if (telegram_chat_id !== undefined)
    updateData.telegram_chat_id = telegram_chat_id;
  if (description !== undefined)
    updateData.description = description === "" ? null : description;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (couponCode !== undefined && couponDiscount !== undefined) {
    updateData.couponCode = couponCode;
    updateData.couponDiscount = couponDiscount;
  }
  if (reminder_template_override_id !== undefined) {
    if (!reminder_template_override_id) {
      updateData.reminder_template_override_id = null;
    } else {
      const ReminderTemplate = require("../models/ReminderTemplate");
      const templateExists = await ReminderTemplate.findById(
        reminder_template_override_id
      );
      if (!templateExists)
        return next(
          new AppError("Reminder template override ID invalid.", 400)
        );
      updateData.reminder_template_override_id = reminder_template_override_id;
    }
  }
  if (reminder_days_override !== undefined) {
    if (reminder_days_override === null || reminder_days_override === "") {
      updateData.reminder_days_override = null;
    } else {
      const daysNum = Number(reminder_days_override);
      if (isNaN(daysNum) || daysNum < 0) {
        return next(
          new AppError(
            "Reminder days override must be a non-negative number.",
            400
          )
        );
      }
      updateData.reminder_days_override = daysNum;
    }
  }

  if (associated_plan_ids !== undefined) {
    if (Array.isArray(associated_plan_ids)) {
      if (associated_plan_ids.length > 0) {
        const validObjectIds = associated_plan_ids.filter((id) =>
          mongoose.Types.ObjectId.isValid(id)
        );
        if (validObjectIds.length !== associated_plan_ids.length) {
          return next(
            new AppError(
              "One or more associated plan IDs have an invalid format.",
              400
            )
          );
        }
        const validPlansCount = await Plan.countDocuments({
          _id: { $in: validObjectIds },
        });
        if (validPlansCount !== validObjectIds.length) {
          return next(
            new AppError("One or more associated plan IDs do not exist.", 400)
          );
        }
        updateData.associated_plan_ids = validObjectIds;
      } else {
        updateData.associated_plan_ids = [];
      }
    } else {
      return next(new AppError("associated_plan_ids must be an array.", 400));
    }
  }

  const updatedChannel = await Channel.findByIdAndUpdate(
    channelId,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ); // NO POPULATION HERE

  if (!updatedChannel) {
    return next(
      new AppError("Channel not found or update failed unexpectedly.", 404)
    );
  }

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "CHANNEL_UPDATED",
    target_type: "Channel",
    target_id: updatedChannel._id,
    description: `Channel '${updatedChannel.name}' updated by ${req.user.phone}.`,
    details: { changes: updateData }, // Log only the changes applied
  });

  res
    .status(200)
    .json({ status: "success", data: { channel: updatedChannel } });
});

// Delete Channel (Hard Delete - Requires 'Channel:delete')
exports.deleteChannel = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  const channelId = req.params.id;
  let channelToDelete;
  if (currentUser.role_id.name !== "SuperAdmin") {
    channelToDelete = await Channel.findOne({
      _id: channelId,
      owner: currentUser._id,
    });
    if (!channelToDelete) {
      return next(new AppError("Channel not found or access denied", 404));
    }
  } else {
    channelToDelete = await Channel.findById(channelId);
    if (!channelToDelete) {
      return next(new AppError("Channel not found", 404));
    }
  }

  const activeSubs = await Subscription.countDocuments({
    channel_id: channelId,
    status: "active",
  });
  if (activeSubs > 0) {
    return next(
      new AppError(
        `Cannot delete channel with ${activeSubs} active subscription(s). Revoke them first.`,
        400
      )
    );
  }
  await User.findByIdAndUpdate(channelToDelete.owner, {
    $pull: { channels: channelToDelete._id }
  });

  await Channel.findByIdAndDelete(channelId);

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "CHANNEL_DELETED",
    target_type: "Channel",
    target_id: channelId,
    description: `Channel '${channelToDelete.name}' (ID: ${channelId}) deleted by ${req.user.phone}.`,
  });
  return res.status(204).json({ status: "success", data: null });
});

// Activate a Channel (Requires 'Channel:update')
exports.activateChannel = catchAsync(async (req, res, next) => {
  const channelId = req.params.id;
  const currentUser = req.user;

  let channelToUpdate;
  if (currentUser.role_id.name !== "SuperAdmin") {
    channelToUpdate = await Channel.findOne({
      _id: channelId,
      owner: currentUser._id,
    });
    if (!channelToUpdate) {
      return next(new AppError("Channel not found or access denied.", 404));
    }
  } else {
    channelToUpdate = await Channel.findById(channelId);
    if (!channelToUpdate) {
      return next(new AppError("Channel not found.", 404));
    }
  }

  if (channelToUpdate.is_active) {
    return res.status(200).json({
      status: "success",
      message: "Channel is already active.",
      data: { channel: channelToUpdate },
    });
  }

  channelToUpdate.is_active = true;
  await channelToUpdate.save({ validateBeforeSave: true });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "CHANNEL_ACTIVATED",
    target_type: "Channel",
    target_id: channelId,
    description: `Channel '${channelToUpdate.name}' activated by ${req.user.phone}.`,
  });

  res.status(200).json({
    status: "success",
    message: "Channel activated successfully.",
    data: { channel: channelToUpdate },
  });
});

// Deactivate a Channel (Requires 'Channel:update')
exports.deactivateChannel = catchAsync(async (req, res, next) => {
  const channelId = req.params.id;
  const currentUser = req.user;

  let channelToUpdate;
  if (currentUser.role_id.name !== "SuperAdmin") {
    channelToUpdate = await Channel.findOne({
      _id: channelId,
      owner: currentUser._id,
    });
    if (!channelToUpdate) {
      return next(new AppError("Channel not found or access denied.", 404));
    }
  } else {
    channelToUpdate = await Channel.findById(channelId);
    if (!channelToUpdate) {
      return next(new AppError("Channel not found.", 404));
    }
  }

  if (!channelToUpdate.is_active) {
    return res.status(200).json({
      status: "success",
      message: "Channel is already inactive.",
      data: { channel: channelToUpdate },
    });
  }

  // Optional: Check for active subscriptions before deactivating? Maybe not, just mark as inactive.
  // const activeSubs = await Subscription.countDocuments({ channel_id: channelId, status: 'active' });
  // if (activeSubs > 0) {
  //     return next(new AppError(`Cannot deactivate channel with ${activeSubs} active subscription(s).`, 400));
  // }

  channelToUpdate.is_active = false;
  await channelToUpdate.save({ validateBeforeSave: true });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "CHANNEL_DEACTIVATED",
    target_type: "Channel",
    target_id: channelId,
    description: `Channel '${channelToUpdate.name}' deactivated by ${req.user.phone}.`,
  });

  res.status(200).json({
    status: "success",
    message: "Channel deactivated successfully.",
    data: { channel: channelToUpdate },
  });
});
