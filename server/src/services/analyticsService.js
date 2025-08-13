// services/analyticsService.js
const Transaction = require("../models/Transaction");
const Subscription = require("../models/Subscription");
const Link = require("../models/Link");
const User = require("../models/User");
const mongoose = require("mongoose");
const {
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subQuarters,
  startOfQuarter,
  endOfQuarter,
  subYears,
} = require("date-fns"); // Added subYears

// --- Helper to get date range ---
const getPeriodDates = (period) => {
  const now = new Date();
  let startDate, endDate;
  switch (period?.toLowerCase()) {
    case "monthly":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case "quarterly":
      startDate = startOfQuarter(subQuarters(now, 1));
      endDate = endOfQuarter(subQuarters(now, 1));
      break;
    case "yearly":
      startDate = startOfYear(subYears(now, 1));
      endDate = endOfYear(subYears(now, 1));
      break;
    default:
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1)); // Default previous month
  }
  return { startDate, endDate };
};

// --- Revenue Calculations ---
exports.calculateRevenue = async ({ startDate, endDate, groupBy }) => {
  const matchStage = { status: "captured" }; // Only count successful transactions
  if (startDate) matchStage.createdAt = { $gte: new Date(startDate) };
  if (endDate) {
    const dateEnd = new Date(endDate);
    dateEnd.setHours(23, 59, 59, 999); // Include whole end day
    if (!matchStage.createdAt) matchStage.createdAt = {};
    matchStage.createdAt.$lte = dateEnd;
  }

  const initialPipeline = [{ $match: matchStage }];
  const groupStage = { _id: null, totalRevenue: { $sum: "$amount" } };
  const finalProjection = { _id: 0, id: "$_id", totalRevenue: 1 };
  let lookupPipeline = [];

  if (groupBy === "channel") {
    groupStage._id = "$channel_id";
    lookupPipeline = [
      {
        $lookup: {
          from: "channels",
          localField: "_id",
          foreignField: "_id",
          as: "info",
        },
      },
      {
        $addFields: {
          name: {
            $ifNull: [{ $first: "$info.name" }, "N/A (Deleted Channel?)"],
          },
        },
      },
    ];
    finalProjection.name = "$name";
  } else if (groupBy === "plan") {
    groupStage._id = "$plan_id";
    lookupPipeline = [
      {
        $lookup: {
          from: "plans",
          localField: "_id",
          foreignField: "_id",
          as: "info",
        },
      },
      {
        $addFields: {
          name: { $ifNull: [{ $first: "$info.name" }, "N/A (Deleted Plan?)"] },
        },
      },
    ];
    finalProjection.name = "$name";
  } else if (groupBy === "salesRep") {
    // We need transactions linked to a Link to determine the sales rep
    initialPipeline.unshift({ $match: { link_id: { $ne: null } } }); // Filter earlier
    initialPipeline.push(
      {
        $lookup: {
          from: "links",
          localField: "link_id",
          foreignField: "_id",
          as: "linkInfo",
        },
      },
      { $unwind: { path: "$linkInfo", preserveNullAndEmptyArrays: false } }, // Ensure link exists
      { $addFields: { linkCreatorId: "$linkInfo.created_by" } }
    );
    groupStage._id = "$linkCreatorId";
    lookupPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "info",
        },
      },
      {
        $addFields: {
          name: { $ifNull: [{ $first: "$info.phone" }, "N/A (Deleted User?)"] },
        },
      }, // Use phone as Sales Rep identifier
    ];
    finalProjection.name = "$name";
  }

  const pipeline = [
    ...initialPipeline,
    { $group: groupStage },
    { $sort: { totalRevenue: -1 } },
    ...lookupPipeline,
    { $project: finalProjection },
  ];

  return Transaction.aggregate(pipeline);
};

// --- Subscription Metrics ---
exports.getSubscriptionMetrics = async ({ startDate, endDate, type }) => {
  const matchStage = {};
  const dateStart = startDate ? new Date(startDate) : null;
  const dateEnd = endDate ? new Date(endDate) : null;
  if (dateStart) dateStart.setHours(0, 0, 0, 0);
  if (dateEnd) dateEnd.setHours(23, 59, 59, 999);

  // Base time filter for New/Renewal - based on when subscription STARTED
  if (type === "new" || type === "renewal") {
    if (dateStart) {
      if (!matchStage.start_date) matchStage.start_date = {};
      matchStage.start_date.$gte = dateStart;
    }
    if (dateEnd) {
      if (!matchStage.start_date) matchStage.start_date = {};
      matchStage.start_date.$lte = dateEnd;
    }
  }

  if (type === "new") {
    matchStage.from_subscription_id = { $in: [null, undefined] };
    return Subscription.countDocuments(matchStage);
  } else if (type === "renewal") {
    matchStage.from_subscription_id = { $ne: null };
    return Subscription.countDocuments(matchStage);
  } else if (type === "expiry") {
    // Count subs that have status 'expired' AND whose end_date was within the period
    const expiryMatch = { status: "expired" };
    if (dateStart) {
      if (!expiryMatch.end_date) expiryMatch.end_date = {};
      expiryMatch.end_date.$gte = dateStart;
    }
    if (dateEnd) {
      if (!expiryMatch.end_date) expiryMatch.end_date = {};
      expiryMatch.end_date.$lte = dateEnd;
    }
    // Require a date range for expiry calculation
    if (!dateStart && !dateEnd) {
      console.warn("Expiry count requires a startDate and/or endDate.");
      return 0;
    }
    return Subscription.countDocuments(expiryMatch);
  }

  // Default: count all subscriptions created/started in the period (if no specific type)
  if (!type) {
    if (dateStart) {
      if (!matchStage.start_date) matchStage.start_date = {};
      matchStage.start_date.$gte = dateStart;
    }
    if (dateEnd) {
      if (!matchStage.start_date) matchStage.start_date = {};
      matchStage.start_date.$lte = dateEnd;
    }
    return Subscription.countDocuments(matchStage);
  }

  // Fallback if type is invalid
  return 0;
};

// --- Churn Rate ---
exports.calculateChurnRate = async ({ period = "monthly" }) => {
  console.warn(
    "Churn rate calculation is complex. Review logic carefully, especially renewal window."
  );
  const { startDate, endDate } = getPeriodDates(period);

  // Active users at the START of the period
  const activeAtStartUsers = await Subscription.distinct("user_id", {
    status: "active",
    start_date: { $lt: startDate }, // Started before the period
    end_date: { $gte: startDate }, // Active at the start date
  });
  const startCount = activeAtStartUsers.length;
  if (startCount === 0)
    return { rate: "0.00", period, startCount: 0, churnedCount: 0 };

  // Users from the start cohort whose latest subscription EXPIRED during the period
  // Find the latest end_date for each user within the cohort
  const latestEndDates = await Subscription.aggregate([
    { $match: { user_id: { $in: activeAtStartUsers } } },
    { $sort: { end_date: -1 } },
    { $group: { _id: "$user_id", lastSubEndDate: { $first: "$end_date" } } },
  ]);

  // Filter those whose latest end date falls within the period
  const potentialChurners = latestEndDates.filter(
    (u) => u.lastSubEndDate >= startDate && u.lastSubEndDate < endDate
  );

  let churnedCount = 0;
  const renewalWindowDays = 7; // How many days after expiry to check for renewal

  for (const userRecord of potentialChurners) {
    const renewalWindowEnd = new Date(userRecord.lastSubEndDate);
    renewalWindowEnd.setDate(renewalWindowEnd.getDate() + renewalWindowDays);

    // Check if this user started a NEW subscription after their last one expired, within the window
    const renewal = await Subscription.findOne({
      user_id: userRecord._id,
      start_date: { $gt: userRecord.lastSubEndDate, $lt: renewalWindowEnd },
    });

    if (!renewal) {
      churnedCount++;
    }
  }

  const churnRate = (churnedCount / startCount) * 100;
  return {
    rate: churnRate.toFixed(2),
    period,
    startCount,
    potentialChurnerCount: potentialChurners.length,
    churnedCount,
  };
};

// --- Customer LTV ---
exports.calculateLtv = async ({ startDate, endDate }) => {
  const matchCriteria = { status: "captured" }; // Only captured transactions
  if (startDate) matchCriteria.createdAt = { $gte: new Date(startDate) };
  if (endDate) {
    const dateEnd = new Date(endDate);
    dateEnd.setHours(23, 59, 59, 999);
    if (!matchCriteria.createdAt) matchCriteria.createdAt = {};
    matchCriteria.createdAt.$lte = dateEnd;
  }
  const pipeline = [
    { $match: matchCriteria },
    { $group: { _id: "$user_id", totalRevenuePerUser: { $sum: "$amount" } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalRevenuePerUser" },
        customerCount: { $sum: 1 }, // Count distinct users from the previous group
      },
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        customerCount: 1,
        averageLtv: {
          $cond: [
            { $gt: ["$customerCount", 0] },
            { $divide: ["$totalRevenue", "$customerCount"] },
            0,
          ],
        },
      },
    },
  ];
  const result = await Transaction.aggregate(pipeline);
  if (result.length > 0) {
    return { ...result[0], averageLtv: result[0].averageLtv.toFixed(2) };
  }
  return { averageLtv: "0.00", totalRevenue: 0, customerCount: 0 };
};

// --- Link Conversion ---
exports.getLinkConversion = async ({
  linkId,
  channelId,
  created_by,
  startDate,
  endDate,
}) => {
  const match = {};
  if (linkId) match._id = new mongoose.Types.ObjectId(linkId);
  if (channelId) match.channel_id = new mongoose.Types.ObjectId(channelId);
  if (created_by) match.created_by = new mongoose.Types.ObjectId(created_by);
  if (startDate) match.createdAt = { $gte: new Date(startDate) };
  if (endDate) {
    const dateEnd = new Date(endDate);
    dateEnd.setHours(23, 59, 59, 999);
    if (!match.createdAt) match.createdAt = {};
    match.createdAt.$lte = dateEnd;
  }
  const links = await Link.find(match)
    .populate("channel_id", "name")
    .populate("created_by", "phone")
    .lean();
  return links.map((link) => ({
    linkId: link._id,
    linkName: link.name,
    urlSlug: link.url_slug,
    channelName: link.channel_id?.name || "N/A",
    salesRep: link.created_by?.phone || "N/A",
    clicks: link.click_count || 0,
    otpVerifications: link.otp_verification_count || 0,
    subscriptions: link.subscription_count || 0,
    // Calculate conversion rates safely, avoiding division by zero
    otpConversionRate:
      link.click_count > 0
        ? ((link.otp_verification_count / link.click_count) * 100).toFixed(2)
        : "0.00",
    subscriptionConversionRate:
      link.otp_verification_count > 0
        ? (
          (link.subscription_count / link.otp_verification_count) *
          100
        ).toFixed(2)
        : "0.00",
    overallConversionRate:
      link.click_count > 0
        ? ((link.subscription_count / link.click_count) * 100).toFixed(2)
        : "0.00",
  }));
};
