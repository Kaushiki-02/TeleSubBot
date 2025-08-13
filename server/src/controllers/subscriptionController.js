const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Plan = require("../models/Plan");
const Transaction = require("../models/Transaction");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const mongoose = require("mongoose");
const paymentService = require("../services/paymentService");
// Revoke Subscription (Requires 'Subscription:revoke')
const axios = require("axios"); // Ensure axios is imported at the top

// Get User's Subscriptions (Requires 'Subscription:read:own')
exports.getMySubscriptions = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Subscription.find({ user_id: req.user._id })
      .populate("plan_id", "name validity_days markup_price")
      .populate("channel_id", "name description")
      .populate("link_id", "name url_slug"),

    req.query
  )
    .filter()
    .sort("-end_date")
    .limitFields()
    .paginate();
  const subscriptions = await features.query;
  res.status(200).json({
    status: "success",
    results: subscriptions.length,
    data: { subscriptions },
  });
});

// Initiate Upgrade Flow (Requires 'Subscription:upgrade')
exports.initiateUpgrade = catchAsync(async (req, res, next) => {
  const subscriptionId = req.params.id;
  const { new_plan_id, action } = req.body;
  const userId = req.user._id;

  if (!new_plan_id)
    return next(new AppError("New plan ID required.", 400));

  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    user_id: userId,
  }).populate("plan_id");

  if (!subscription)
    return next(new AppError("Subscription not found or does not belong to you.", 404));

  if (subscription.status !== "active" && action === "extend")
    return next(new AppError("Only active subscriptions can be upgraded.", 400));

  const newPlan = await Plan.findById(new_plan_id);
  if (!newPlan?.is_active)
    return next(new AppError("New plan not found or inactive.", 404));

  const upgradeCost =
    (newPlan.markup_price > 0 && newPlan.markup_price) || newPlan.discounted_price;

  if (upgradeCost <= 0)
    return next(new AppError("Upgrade cost invalid.", 400));

  const currency = "INR";

  // ✅ Check for existing 'created' transaction with same user, plan, and subscription
  const existingTransaction = await Transaction.findOne({
    user_id: userId,
    plan_id: new_plan_id,
    subscription_id: subscription._id,
    status: "created",
  });

  if (existingTransaction && existingTransaction.razorpay_order_id) {
    return res.status(200).json({
      status: "success",
      data: {
        orderId: existingTransaction.razorpay_order_id,
        amount: existingTransaction.amount,
        currency: existingTransaction.currency,
        razorpayKeyId:
          process.env.NODE_ENV === "prod"
            ? process.env.RAZORPAY_KEY_ID_PROD
            : process.env.RAZORPAY_KEY_ID,
      },
    });
  }

  const notes = {
    userid: userId,
    planid: new_plan_id,
    subscriptionid: subscriptionId,
    action,
  };

  const receiptId = `upgrade_${Date.now()}`;
  const razorpayOrder = await paymentService.createRazorpayOrder(
    upgradeCost,
    currency,
    receiptId,
    notes
  );

  if (!razorpayOrder?.id)
    return next(new AppError("Failed to create upgrade order.", 500));

  await Transaction.create({
    user_id: userId,
    plan_id: new_plan_id,
    channel_id: subscription.channel_id,
    amount: upgradeCost,
    currency,
    razorpay_order_id: razorpayOrder.id,
    status: "created",
    subscription_id: subscription._id,
  });

  logger.logAction({
    actor_type: "User",
    actor_id: userId,
    action_type: "ORDER_CREATED",
    target_type: "Subscription",
    target_id: subscriptionId,
    description: `${action.toUpperCase()} order ${razorpayOrder.id} created for sub ${subscriptionId} to plan ${newPlan.name}.`,
  });

  res.status(201).json({
    status: "success",
    data: {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency,
      razorpayKeyId:
        process.env.NODE_ENV === "prod"
          ? process.env.RAZORPAY_KEY_ID_PROD
          : process.env.RAZORPAY_KEY_ID,
    },
  });
});

exports.getRealAllSubscriptions = catchAsync(async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({})
      .select('end_date telegramUser_id')
      .populate({
        path: 'user_id',
        select: 'phone',
      })
      .populate({
        path: 'channel_id',
        select: 'name reminder_days_override telegram_chat_id',
      })
      .exec();

    res.status(200).json({
      status: "success",
      results: subscriptions.length,
      data: subscriptions,
    });
  }
  catch (e) {
    res.status(200).json({
      status: "error",
      error: e.message
    });
  }
}
)
exports.getAllSubscriptions = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  const { channelId } = req.query;

  // 1) Build baseFilter and populationOptions
  const baseFilter = {};
  const populationOptions = [
    { path: "user_id", select: "phone aadhar_number pan_number" },
    { path: "plan_id", select: "name" },
    { path: "channel_id", select: "name associated_plan_ids" },
    { path: "link_id", select: "name url_slug" },
  ];

  if (currentUser.role_id.name === "Admin") {
    // Admin: only their channels
    // assume req.user.channels was populated upstream, or fetch here:
    await currentUser.populate("channels", "_id");
    const ids = currentUser.channels.map((c) => c._id);
    baseFilter.channel_id = { $in: ids };
  } else if (currentUser.role_id.name === "SuperAdmin") {
    // SuperAdmin: optional ?channelId filter
    if (channelId) {
      if (!mongoose.Types.ObjectId.isValid(channelId)) {
        return next(new AppError("Invalid channelId format.", 400));
      }
      baseFilter.channel_id = channelId;
    }
  } else {
    return next(new AppError("Access Denied", 403));
  }

  // 2) Build the Mongoose query
  let query = Subscription.find(baseFilter).sort("-createdAt");
  for (const pop of populationOptions) {
    query = query.populate(pop);
  }

  // 3) Apply filtering/sorting/pagination
  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const subscriptions = await features.query;

  // 5) Group by channel
  const grouped = subscriptions.reduce((acc, sub) => {
    const ch = sub.channel_id;
    const chId = ch?._id?.toString() ?? "unknown";
    const chName = ch?.name || "Unknown Channel";
    if (!acc[chId]) {
      acc[chId] = {
        channel_id: chId,
        channel_name: chName,
        subscriptions: [],
      };
    }
    acc[chId].subscriptions.push(sub);
    return acc;
  }, {});

  // 6) Respond
  res.status(200).json({
    status: "success",
    results: subscriptions.length,
    // total: totalCount,
    data: { subscriptions: Object.values(grouped) },
  });
});

// Get Single Subscription (Requires 'Subscription:read')
exports.getSubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findById(req.params.id)
    .populate("user_id", "phone role_id")
    .populate("plan_id", "name discounted_price markup_price validity_days")
    .populate("channel_id", "name telegram_chat_id")
    .populate("link_id", "name url_slug created_by")
    .populate("from_subscription_id", "end_date");

  if (!subscription) return next(new AppError("Subscription not found", 404));

  // Conditionally populate role name if user_id exists and has role_id
  if (subscription.user_id && subscription.user_id.role_id) {
    await Subscription.populate(subscription, {
      path: "user_id.role_id",
      select: "name",
    });
  }

  // Check admin access
  const currentUser = await User.findById(req.user._id).populate(
    "channels",
    "_id"
  );
  if (currentUser.role_id.name === "Admin") {
    const allowedChannelIds = currentUser.channels.map((c) => c._id.toString());
    if (!allowedChannelIds.includes(subscription.channel_id._id.toString())) {
      return next(new AppError("Access denied to this subscription.", 403));
    }
  }

  res.status(200).json({ status: "success", data: { subscription } });
});

// Extend Subscription (Requires 'Subscription:extend')
exports.extendSubscription = catchAsync(async (req, res, next) => {
  const { extension_days } = req.body;
  const subscriptionId = req.params.id;

  if (!Number.isInteger(extension_days) || extension_days <= 0)
    return next(
      new AppError("Extension days must be a positive integer.", 400)
    );

  const subscription = await Subscription.findById(subscriptionId).populate(
    "channel_id",
    "_id name"
  );
  if (!subscription) return next(new AppError("Subscription not found.", 404));
  if (subscription.status === "revoked")
    return next(new AppError("Cannot extend revoked subscription.", 400));

  const currentUser = await User.findById(req.user._id).populate(
    "channels",
    "_id"
  );

  if (currentUser.role_id.name === "Admin") {
    const allowedChannelIds = currentUser.channels.map((c) => c._id.toString());
    if (!allowedChannelIds.includes(subscription.channel_id._id.toString())) {
      return next(new AppError("Access denied to this subscription.", 403));
    }
  }

  const baseDate =
    subscription.end_date > Date.now() ? subscription.end_date : new Date();
  subscription.end_date = new Date(
    baseDate.getTime() + extension_days * 86400000
  );

  if (subscription.status === "expired") subscription.status = "active";

  await subscription.save({ validateModifiedOnly: true });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "SUBSCRIPTION_EXTENDED",
    target_type: "Subscription",
    target_id: subscriptionId,
    description: `Subscription extended by ${extension_days} days. New end date: ${subscription.end_date.toISOString()}.`,
  });

  res.status(200).json({ status: "success", data: { subscription } });
});

// Bulk Extend Subscriptions (Requires 'Subscription:extend')
exports.bulkExtendSubscription = catchAsync(async (req, res, next) => {
  const { subscription_ids, extension_days } = req.body;

  if (!Array.isArray(subscription_ids) || !subscription_ids.length) {
    return next(
      new AppError("Subscription IDs must be a non-empty array.", 400)
    );
  }
  if (!Number.isInteger(extension_days) || extension_days <= 0) {
    return next(
      new AppError("Extension days must be a positive integer.", 400)
    );
  }

  const currentUser = await User.findById(req.user._id).populate(
    "channels",
    "_id"
  );
  const allowedChannelIds =
    currentUser.role_id.name === "Admin"
      ? currentUser.channels.map((c) => c._id.toString())
      : null;

  const updatedSubs = [];
  const errors = [];

  for (const subId of subscription_ids) {
    if (!mongoose.Types.ObjectId.isValid(subId)) {
      errors.push({ id: subId, error: "Invalid ID format." });
      continue;
    }

    try {
      const subscription = await Subscription.findById(subId).populate(
        "channel_id",
        "_id name"
      );
      if (!subscription) {
        errors.push({ id: subId, error: "Subscription not found." });
        continue;
      }

      // Admin restriction: skip if subscription's channel is not allowed
      if (
        allowedChannelIds &&
        !allowedChannelIds.includes(subscription.channel_id._id.toString())
      ) {
        errors.push({
          id: subId,
          error: "Access denied to this subscription.",
        });
        continue;
      }

      if (subscription.status === "revoked") {
        errors.push({
          id: subId,
          error: "Cannot extend revoked subscription.",
        });
        continue;
      }

      const baseDate =
        subscription.end_date > Date.now() ? subscription.end_date : new Date();
      subscription.end_date = new Date(
        baseDate.getTime() + extension_days * 86400000
      );

      if (subscription.status === "expired") subscription.status = "active";

      await subscription.save({ validateModifiedOnly: true });
      updatedSubs.push(subId);

      logger.logAction({
        actor_type: req.user.role_id.name,
        actor_id: req.user._id,
        action_type: "SUBSCRIPTION_EXTENDED_BULK",
        target_type: "Subscription",
        target_id: subId,
        description: `Bulk extend applied: ${extension_days} days.`,
      });
    } catch (error) {
      errors.push({ id: subId, error: error.message });
      logger.logAction({
        actor_type: "System",
        action_type: "SUBSCRIPTION_EXTENDED_BULK_ERROR",
        description: `Error bulk extending sub ${subId}: ${error.message}`,
      });
    }
  }

  res.status(200).json({
    status: "success",
    message: `Bulk extend processed: ${updatedSubs.length} succeeded, ${errors.length} failed.`,
    data: { succeeded: updatedSubs, failed: errors },
  });
});

exports.revokeSubscription = catchAsync(async (req, res, next) => {
  const subscriptionId = req.params.id;

  const subscription = await Subscription.findById(subscriptionId)
    .populate("user_id", "phone telegram_id")
    .populate("channel_id", "name telegram_chat_id _id")
    .populate("link_id", "url_slug");

  if (!subscription) return next(new AppError("Subscription not found.", 404));
  if (subscription.status === "revoked") {
    return res.status(200).json({
      status: "success",
      message: "Subscription is already revoked.",
      data: { subscription },
    });
  }

  const currentUser = await User.findById(req.user._id).populate(
    "channels",
    "_id"
  );
  if (currentUser.role_id.name === "Admin") {
    const allowedChannelIds = currentUser.channels.map((c) => c._id.toString());
    if (!allowedChannelIds.includes(subscription.channel_id._id.toString())) {
      return next(new AppError("Access denied to this subscription.", 403));
    }
  }

  subscription.status = "revoked";

  // 🔔 Add this webhook call
  try {
    await axios.post("https://n8n.algowiz.in/webhook/5b258666-4ec1-428f-82b1-f01a4f58ec7d", {
      action: "revoke",
      details: {
        chat_id: subscription.channel_id?.telegram_chat_id,
        user_id: subscription?.telegramUser_id,
        invite_link: subscription?.link_id.url_slug
      },
    });
  } catch (err) {
    logger.logAction({
      actor_type: "System",
      action_type: "WEBHOOK_REVOKE_NOTIFICATION_FAILED",
      target_type: "Subscription",
      target_id: subscriptionId,
      description: `Failed to notify webhook after revoke. Error: ${err.message}`,
    });
  }
  await subscription.save({ validateModifiedOnly: true });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "SUBSCRIPTION_REVOKED_MANUAL",
    target_type: "Subscription",
    target_id: subscriptionId,
    description: `Subscription revoked for user ${subscription.user_id?.phone}.`,
  })


  res.status(200).json({
    status: "success",
    message: "Subscription revoked successfully.",
    data: { subscription },
  });
});
