const Transaction = require("../models/Transaction");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Channel = require("../models/Channel");
const Link = require("../models/Link");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const paymentService = require("../services/paymentService");
const telegramService = require("../services/telegramService");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");

// Helper to activate/update subscription post-payment
const activateSubscription = async (transaction, action) => {
  try {
    const {
      plan_id,
      subscription_id,
      user_id,
      channel_id,
      _id: txId,
    } = transaction;

    const plan = await Plan.findById(plan_id);
    if (!plan) throw new Error(`Plan ${plan_id} not found (tx ${txId})`);

    let activeSubscription;

    if (action === "upgrade") {
      const currentSub = await Subscription.findById(subscription_id);
      if (!currentSub)
        throw new Error(
          `Subscription ${subscription_id} not found (tx ${txId})`
        );

      const newEndDate = new Date(
        currentSub.end_date.getTime() + plan.validity_days * 24 * 60 * 60 * 1000
      );

      activeSubscription = await Subscription.findByIdAndUpdate(
        subscription_id,
        {
          plan_id,
          end_date: newEndDate,
          status: "active",
        },
        { new: true }
      );

      logger.logAction({
        actor_type: "System",
        action_type: "SUBSCRIPTION_EXTENDED",
        target_type: "Subscription",
        target_id: activeSubscription._id,
        description: `Subscription upgraded via transaction ${txId}`,
      });
    } else {
      const now = new Date();
      const endDate = new Date(
        now.getTime() + plan.validity_days * 24 * 60 * 60 * 1000
      );
      const user = await User.findById(user_id);

      if (!user) throw new Error(`User ${user_id} not found (tx ${txId})`);
      const channe = await Channel.findById(channel_id);
      const inviteLink = await telegramService.createChannelInviteLink(
        channe.telegram_chat_id
      );

      const newSubData = {
        user_id,
        plan_id,
        channel_id,
        start_date: now,
        end_date: endDate,
        status: "kycSub",
      };

      if (action === "renew") {
        newSubData.from_subscription_id = subscription_id;
      }

      activeSubscription = await Subscription.create(newSubData);
      const linkData = {
        url_slug: inviteLink.link,
        channel_id,
        subid: activeSubscription._id,
      };

      const savedLink = await Link.create(linkData);
      activeSubscription.link_id = savedLink._id;
      activeSubscription.save();

      logger.logAction({
        actor_type: "System",
        action_type:
          action === "renew" ? "SUBSCRIPTION_RENEWED" : "SUBSCRIPTION_CREATED",
        target_type: "Subscription",
        target_id: activeSubscription._id,
        description: `Subscription ${action} via transaction ${txId}`,
      });
    }

    await Transaction.findByIdAndUpdate(txId, {
      subscription_id: activeSubscription._id,
    });

    return "OK";
  } catch (err) {
    logger.logAction({
      actor_type: "System",
      action_type: "SUB_ACTIVATION_FAILED",
      target_type: "Transaction",
      target_id: transaction._id,
      description: `Subscription activation failed (tx ${transaction._id}): ${err.message}`,
    });
    throw err;
  }
};

exports.initiateSubscribe = catchAsync(async (req, res, next) => {
  const { plan_id, couponCode } = req.body;
  const userId = req.user._id;
  if (!plan_id) return next(new AppError("New plan ID required.", 400));

  const newPlan = await Plan.findById(plan_id).populate(
    "channel_id",
    "couponCode couponDiscount"
  );
  if (!newPlan?.is_active)
    return next(new AppError("New plan not found or inactive.", 404));

  if (couponCode && couponCode !== newPlan.channel_id.couponCode) {
    return next(new AppError("Coupon Code invalid.", 404));
  }

  const couponDiscount =
    couponCode !== undefined ? newPlan.channel_id.couponDiscount : 0;
  const basePrice =
    newPlan.discounted_price > 0
      ? newPlan.discounted_price
      : newPlan.markup_price;
  const upgradeCost = basePrice * ((100 - couponDiscount) / 100);

  if (upgradeCost <= 0)
    return next(new AppError("Upgrade cost invalid.", 400));

  const currency = "INR";

  // Check for existing 'created' transaction
  const existingTransaction = await Transaction.findOne({
    user_id: userId,
    plan_id: plan_id,
    status: "created",
  });

  if (existingTransaction && existingTransaction.razorpay_order_id) {
    // Reuse existing order
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

  const notes = { userid: userId, planid: plan_id };
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
    plan_id: plan_id,
    channel_id: newPlan.channel_id,
    amount: upgradeCost,
    currency,
    razorpay_order_id: razorpayOrder.id,
    status: "created",
  });

  logger.logAction({
    actor_type: "User",
    actor_id: userId,
    action_type: "ORDER_CREATED",
    target_type: "Plan",
    target_id: plan_id,
    description: `CREATE order ${razorpayOrder.id} created for sub to plan ${newPlan.name}.`,
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

// Get User's Transaction History (Requires 'Transaction:read:own')
exports.getMyTransactionHistory = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Transaction.find({ user_id: req.user._id })
      .populate("plan_id", "name")
      .populate("channel_id", "name"),
    req.query
  )
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate();
  const transactions = await features.query;
  res.status(200).json({
    status: "success",
    results: transactions.length,
    data: { transactions },
  });
});

// Get All Transactions (Requires 'Transaction:read:all')
exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Transaction.find()
      .populate("user_id", "phone")
      .populate("plan_id", "name")
      .populate("channel_id", "name")
      .populate("subscription_id", "status end_date"),
    req.query
  )
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate();
  const transactions = await features.query;
  res.status(200).json({
    status: "success",
    results: transactions.length,
    data: { transactions },
  });
});

// Get Single Transaction (Requires 'Transaction:read')
exports.getTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate("user_id", "phone role_id")
    .populate("plan_id", "name validity_days")
    .populate("channel_id", "name")
    .populate("subscription_id");
  if (!transaction) return next(new AppError("Transaction not found", 404));
  if (transaction.user_id && transaction.user_id.role_id) {
    // Check if user_id and role_id exist before populating
    await Transaction.populate(transaction, {
      path: "user_id.role_id",
      select: "name",
    });
  }
  res.status(200).json({ status: "success", data: { transaction } });
});

exports.getincompleteTransaction = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  const { channelId } = req.query;

  // 1) Build baseFilter and populationOptions
  const baseFilter = { status: 'created' };
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

  let transactions = await Transaction.find(baseFilter)
    .populate("user_id", "phone name email")
    .populate("plan_id", "name")
    .populate("channel_id", "name")
    .populate("subscription_id", "status end_date");

  const enhancedTransactions = transactions.map((tx) => {
    if (tx.subscription_id) {
      if (tx.subscription_id.status === "expired") {
        tx._doc.type = "expired";
      } else if (tx.subscription_id.status === "active") {
        tx._doc.type = "upgrade";
      } else {
        tx._doc.type = "unknown";
      }
    } else {
      tx._doc.type = "created";
    }
    return tx;
  });

  res.status(200).json({ status: "success", data: { transactions: enhancedTransactions } });
});

// Get Transaction Invoice (Requires 'Transaction:read:invoice')
exports.getTransactionInvoice = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id).select(
    "razorpay_payment_id razorpay_invoice_id invoice_url user_id"
  ); // Added user_id
  if (!transaction) return next(new AppError("Transaction not found", 404));

  // Check if the requesting user owns the transaction or has global read permission
  const canReadAll = req.user.role_id.permissions.some(
    (p) => p.resource === "Transaction" && p.action === "read:all"
  );
  if (!canReadAll && !transaction.user_id.equals(req.user._id)) {
    return next(new AppError("Permission denied to view this invoice.", 403));
  }

  if (transaction.invoice_url) return res.redirect(transaction.invoice_url); // Redirect if custom URL exists

  // TODO: Implement fetching invoice URL from Razorpay if needed using razorpay_payment_id or razorpay_invoice_id
  // const invoice = await paymentService.fetchRazorpayInvoice(transaction.razorpay_payment_id || transaction.razorpay_invoice_id);
  // if (invoice?.short_url) return res.redirect(invoice.short_url);

  return next(
    new AppError(
      "No invoice available for this transaction at the moment.",
      404
    )
  );
});

// Reconciliation Endpoint (Requires 'Transaction:reconcile')
exports.getReconciliationData = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate)
    return next(
      new AppError(
        "Start date and end date query parameters are required.",
        400
      )
    );

  const localTransactions = await Transaction.find({
    status: "captured",
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  }).lean();
  let razorpayPayoutData = [];
  try {
    // razorpayPayoutData = await paymentService.fetchRazorpayPayouts({ fromDate: startDate, toDate: endDate });
    console.warn(
      "Reconciliation: Needs actual Razorpay payout/settlement API integration."
    );
  } catch (error) {
    console.error("Error fetching RZP payouts:", error);
  }

  const comparisonResults = {
    matched: [],
    localOnly: [],
    razorpayOnly: [],
    discrepancies: [],
  };
  res.status(200).json({
    status: "success",
    message: "Basic reconciliation data fetched (comparison logic pending).",
    data: {
      comparisonResults,
      rawLocal: localTransactions,
      rawRazorpay: razorpayPayoutData,
    },
  });
});

// Webhook Handler (Public - verification done within)
exports.handleRazorpayWebhook = catchAsync(async (req, res, next) => {
  try {
    const event = req.body.event;
    const payload = req.body.payload;

    logger.logAction({
      actor_type: "System",
      action_type: `WEBHOOK_RAZORPAY_${event?.toUpperCase?.()}`,
      description: `Processing webhook: ${event}`,
      details: {
        entity_id: payload?.payment?.entity?.id || payload?.order?.entity?.id,
      },
    });

    switch (event) {
      case "payment.captured":
        try {
          const orderId = payload?.payment?.entity?.order_id;
          const paymentId = payload?.payment?.entity?.id;
          const { action } = payload?.payment?.entity?.notes || {};

          if (!orderId || !paymentId) {
            throw new Error("Missing order_id or payment_id in payload");
          }

          const transaction = await Transaction.findOneAndUpdate(
            { razorpay_order_id: orderId },
            { razorpay_payment_id: paymentId, status: "captured" }
          );

          if (!transaction) {
            throw new Error(`Transaction not found for order_id: ${orderId}`);
          }

          await activateSubscription(transaction, action);
        } catch (err) {
          logger.logAction({
            actor_type: "System",
            action_type: "WEBHOOK_PAYMENT_CAPTURED_ERROR",
            description: "Error processing payment.captured",
            error: err.message,
            details: { payload },
          });
        }
        break;

      case "payment.failed":
        try {
          const failedOrderId = payload?.payment?.entity?.order_id;
          const failedPaymentId = payload?.payment?.entity?.id;

          if (!failedOrderId || !failedPaymentId) {
            throw new Error(
              "Missing order_id or payment_id in failed payment payload"
            );
          }

          const failedTx = await Transaction.findOneAndUpdate(
            { razorpay_order_id: failedOrderId, status: { $ne: "failed" } },
            {
              $set: { status: "failed", razorpay_payment_id: failedPaymentId },
            },
            { new: true }
          );

          if (failedTx) {
            console.log(
              `Webhook: Marked transaction ${failedTx._id} as failed.`
            );
            logger.logAction({
              actor_type: "System",
              action_type: "TRANSACTION_FAILED_VIA_WEBHOOK",
              target_type: "Transaction",
              target_id: failedTx._id,
              description: `Tx status set to failed via webhook.`,
            });
          } else {
            console.warn(
              `Webhook: Received payment.failed for unknown or already failed order ${failedOrderId}`
            );
          }
        } catch (err) {
          logger.logError({
            actor_type: "System",
            action_type: "WEBHOOK_PAYMENT_FAILED_ERROR",
            description: "Error processing payment.failed",
            error: err.message,
            details: { payload },
          });
        }
        break;
      case "payment.authorized":
        console.log(`Webhook: Authorised Payment Somehow`);
        break;

      default:
        console.log(`Webhook: Unhandled Razorpay event: ${event}`);
    }

    // Respond 200 OK to Razorpay to acknowledge receipt
    res.status(200).json({ status: "ok" });
  } catch (err) {
    logger.logAction({
      actor_type: "System",
      action_type: "WEBHOOK_HANDLER_ERROR",
      description: "Unhandled error in webhook handler",
      error: err.message,
      details: { body: req.body },
    });
    // Respond with 500 to indicate server error (optional - Razorpay expects 200)
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});
