const catchAsync = require("../utils/catchAsync");
const analyticsService = require("../services/analyticsService");
const logger = require("../utils/logger");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const AppError = require("../utils/appError");
const Role = require("../models/Role");
const User = require("../models/User");
const Channel = require("../models/Channel");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose")
const monthArray = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

exports.getDashboardSummary = catchAsync(async (req, res, next) => {
  // Requires 'Analytics:read:dashboard' permission (or similar)
  // Only SuperAdmin should typically have this permission based on the plan.

  // Get the ID for the Admin role
  const adminRole = await Role.findOne({ name: "Admin" }).select("_id");
  const adminRoleId = adminRole?._id; // Use optional chaining

  const counts = {};

  // Count Total Users (all verified users)
  counts.totalUsers = await User.countDocuments({
    otp_verified_at: { $ne: null },
  });

  // Count Total Admins (users with the Admin role)
  // Only count if Admin role exists
  counts.totalAdmins = adminRoleId
    ? await User.countDocuments({ role_id: adminRoleId })
    : 0;

  // Count Total Channels (all channels, active or inactive)
  counts.totalChannels = await Channel.countDocuments();

  // Count Total Active Channels
  counts.totalActiveChannels = await Channel.countDocuments({
    is_active: true,
  });

  // Count Total Plans (all plans, active or inactive)
  counts.totalPlans = await Plan.countDocuments();

  // Count Total Active Plans
  counts.totalActivePlans = await Plan.countDocuments({ is_active: true });

  // Count Total Active Subscriptions
  counts.totalActiveSubscriptions = await Subscription.countDocuments({
    status: "active",
  });

  // Get recent revenue (e.g., last 30 days) - Reuse analytics service logic
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentRevenueData = await analyticsService.calculateRevenue({
    startDate: thirtyDaysAgo,
  });
  counts.recentRevenue = recentRevenueData?.[0]?.totalRevenue || 0; // Assuming it returns an array with total

  logger.logAction({
    actor_type: req.user.role_id.name, // Should be SuperAdmin
    actor_id: req.user._id,
    action_type: "ANALYTICS_DASHBOARD_VIEWED",
    description: "Dashboard summary viewed by SuperAdmin.",
  });

  res.status(200).json({ status: "success", data: counts });
});

exports.getRevenue = catchAsync(async (req, res, next) => {
  const data = await analyticsService.calculateRevenue(req.query);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "ANALYTICS_REVENUE_VIEWED",
    description: `Revenue report viewed. Filters: ${JSON.stringify(req.query)}`,
  });
  res.status(200).json({ status: "success", data });
});

exports.getSubscriptionMetrics = catchAsync(async (req, res, next) => {
  const data = await analyticsService.getSubscriptionMetrics(req.query);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "ANALYTICS_SUB_METRICS_VIEWED",
    description: `Subscription metrics report viewed. Filters: ${JSON.stringify(
      req.query
    )}`,
  });
  res.status(200).json({ status: "success", data: { count: data } }); // Return count directly
});

exports.getChurnRate = catchAsync(async (req, res, next) => {
  const data = await analyticsService.calculateChurnRate(req.query);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "ANALYTICS_CHURN_VIEWED",
    description: `Churn rate report viewed. Filters: ${JSON.stringify(
      req.query
    )}`,
  });
  res.status(200).json({ status: "success", data });
});

exports.getCustomerLtv = catchAsync(async (req, res, next) => {
  const data = await analyticsService.calculateLtv(req.query);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "ANALYTICS_LTV_VIEWED",
    description: `LTV report viewed. Filters: ${JSON.stringify(req.query)}`,
  });
  res.status(200).json({ status: "success", data });
});

exports.getLinkConversion = catchAsync(async (req, res, next) => {
  // Scope query for Sales role
  // This depends on how permissions are checked (middleware vs controller)
  const query = { ...req.query };
  // Assuming middleware has already verified base permission 'Analytics:read:link:all' or 'Analytics:read:link:own'
  if (
    req.user.role_id.name === "Sales" &&
    !req.user.role_id.permissions.some(
      (p) => p.resource === "Analytics" && p.action === "read:link:all"
    )
  ) {
    // If only 'own' permission, force filter by creator
    query.created_by = req.user._id.toString();
    delete query.salesRepId; // Ignore if they try to filter by others
  } else if (query.salesRepId) {
    // Admin/SuperAdmin filtering by salesRepId
    query.created_by = query.salesRepId;
  }

  const data = await analyticsService.getLinkConversion(query);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "ANALYTICS_LINK_CONVERSION_VIEWED",
    description: `Link conversion report viewed. Filters: ${JSON.stringify(
      req.query
    )}`,
  });
  res.status(200).json({ status: "success", results: data.length, data });
});

// Generic Export Endpoint
exports.exportReport = catchAsync(async (req, res, next) => {
  const { reportType, format = "csv", ...filters } = req.query;

  // Permission check should ideally happen via middleware based on reportType
  // This is a simplified check
  const permissionMap = {
    revenue: "Analytics:export",
    "subscription-metrics": "Analytics:export",
    "churn-rate": "Analytics:export",
    ltv: "Analytics:export",
    "link-conversion": "Analytics:export",
  };
  const requiredPermission = permissionMap[reportType];
  if (!requiredPermission)
    return next(new AppError(`Invalid report type: ${reportType}`, 400));
  // Middleware authorize(requiredPermission) should handle the actual check

  // Fetch Data
  let data;
  let fields;
  let filename = `crm_${reportType}_report`;

  if (
    reportType === "link-conversion" &&
    req.user.role_id.name === "Sales" &&
    !req.user.role_id.permissions.some(
      (p) => p.resource === "Analytics" && p.action === "read:link:all"
    )
  ) {
    filters.created_by = req.user._id.toString();
  }

  switch (reportType) {
    case "revenue":
      data = await analyticsService.calculateRevenue(filters);
      fields = filters.groupBy
        ? Object.keys(data[0] || {}).map((k) => ({ label: k, value: k }))
        : [{ label: "Total Revenue", value: "totalRevenue" }];
      break;
    case "subscription-metrics":
      return next(
        new AppError(
          "Export not supported for subscription metrics count yet.",
          501
        )
      );
    case "link-conversion":
      data = await analyticsService.getLinkConversion(filters);
      fields = [
        { label: "Link ID", value: "linkId" },
        { label: "Link Name", value: "linkName" },
        { label: "Slug", value: "urlSlug" },
        { label: "Channel", value: "channelName" },
        { label: "Sales Rep", value: "salesRep" },
        { label: "Clicks", value: "clicks" },
        { label: "OTP Verifs", value: "otpVerifications" },
        { label: "Subs", value: "subscriptions" },
        { label: "OTP Conv Rate (%)", value: "otpConversionRate" },
        { label: "Sub Conv Rate (%)", value: "subscriptionConversionRate" },
        { label: "Overall Conv Rate (%)", value: "overallConversionRate" },
      ];
      break;
    default:
      return next(
        new AppError(`Report type '${reportType}' export not configured.`, 400)
      );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return next(new AppError(`No data for report '${reportType}'.`, 404));
  }

  // Format and Send
  if (format.toLowerCase() === "csv") {
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.csv`
    );
    res.status(200).send(csv);
  } else if (format.toLowerCase() === "pdf") {
    console.warn("PDF export requires detailed table generation logic.");
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.pdf`
    );
    doc.pipe(res);
    doc
      .fontSize(18)
      .text(`${reportType.replace("-", " ").toUpperCase()} Report`, {
        align: "center",
      });
    doc.moveDown();
    // Basic Table Header (Example)
    if (fields && Array.isArray(data)) {
      const colWidth = 500 / fields.length; // Example width
      let y = doc.y;
      doc.fontSize(8);
      fields.forEach((field, i) => {
        doc.text(field.label, 30 + i * colWidth, y, {
          width: colWidth,
          align: "center",
          lineBreak: false,
        });
      });
      doc.moveDown(1.5);
      // Basic Table Rows (Example)
      data.forEach((row) => {
        y = doc.y;
        fields.forEach((field, i) => {
          let val =
            row[field.value] !== undefined && row[field.value] !== null
              ? row[field.value].toString()
              : "";
          if (val.length > 20) val = val.substring(0, 18) + ".."; // Truncate long strings
          doc.text(val, 30 + i * colWidth, y, {
            width: colWidth,
            align: "left",
            lineBreak: false,
          });
        });
        doc.moveDown(0.5);
      });
    }
    doc.end();
  } else {
    return next(new AppError(`Unsupported format: ${format}.`, 400));
  }

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: `ANALYTICS_EXPORT_${reportType.toUpperCase()}`,
    description: `Report exported: ${reportType}, Format: ${format}.`,
  });
});
const getAdminChannelIds = async (adminId) => {
  const channels = await Channel.find({ owner: adminId }, { _id: 1 });
  return channels.map(c => c._id);
};

const getTotalRevenue = async (startDate, endDate, adminChannelIds) => {
  const revenue = await Transaction.aggregate([
    {
      $match: {
        status: "captured",
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        channel_id: { $in: adminChannelIds },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
      },
    },
  ]);
  return revenue[0] ? revenue[0].totalRevenue : 0;
};

const getTotalSubscribers = async (adminChannelIds) => {
  return await Subscription.countDocuments({
    status: "active",
    channel_id: { $in: adminChannelIds }
  });
};

const getAvgLifetimeValue = async (adminChannelIds, startDate, endDate) => {
  const transactions = await Transaction.find({
    status: "captured",
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    channel_id: { $in: adminChannelIds }
  })

  const totalLifetimeValue = transactions.reduce((acc, txn) => {
    const price = txn.amount || 0;
    return acc + price;
  }, 0);

  return transactions.length ? totalLifetimeValue / transactions.length : 0;
};

const getTotalRenewals = async (startDate, endDate, adminChannelIds) => {
  return await Subscription.countDocuments({
    from_subscription_id: { $ne: null },
    start_date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    channel_id: { $in: adminChannelIds }
  });
};

const getDailyRevenue = async (startDate, endDate, adminChannelIds) => {
  return await Transaction.aggregate([
    {
      $match: {
        status: "captured",
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        channel_id: { $in: adminChannelIds }
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { "_id": 1 } }
  ]);
};

const getChurnRate = async (startDate, endDate, adminChannelIds) => {
  const churned = await Subscription.countDocuments({
    status: { $in: ["expired", "revoked"] },
    end_date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    channel_id: { $in: adminChannelIds }
  });

  const totalAtStart = await Subscription.countDocuments({
    start_date: { $lte: new Date(startDate) },
    status: "active",
    channel_id: { $in: adminChannelIds }
  });

  return totalAtStart ? (churned / totalAtStart) * 100 : 0;
};

const getRevenueByChannel = async (startDate, endDate, adminChannelIds) => {
  const revenue = await Transaction.aggregate([
    {
      $match: {
        status: "captured",
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        channel_id: { $in: adminChannelIds }
      },
    },
    {
      $group: {
        _id: "$channel_id",
        totalRevenue: { $sum: "$amount" },
      },
    },
    {
      $lookup: {
        from: "channels",
        localField: "_id",
        foreignField: "_id",
        as: "channel",
      },
    },
    { $unwind: "$channel" },
    {
      $project: {
        channelName: "$channel.name",
        totalRevenue: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return revenue;
};


exports.AdminDashboardController = {
  async getDashboardData(req, res) {
    try {
      const { start_date, end_date, aggregation, year, month } = req.body;
      const adminId = req.user.id;

      const parsedStartDate = start_date ? new Date(start_date) : null;
      const parsedEndDate = end_date ? new Date(end_date) : null;
      const parsedYear = year ? parseInt(year) : null;
      const parsedMonth = month ? parseInt(month) - 1 : null;
      const adminChannelIds = await getAdminChannelIds(adminId);

      let startDate = parsedStartDate;
      let endDate = parsedEndDate;
      let dailyRevenue = [];

      if (aggregation === "mon" && parsedYear !== null && parsedMonth !== null) {
        startDate = new Date(parsedYear, parsedMonth, 1);
        endDate = new Date(parsedYear, parsedMonth + 1, 0);
        dailyRevenue = await getDailyRevenue(startDate, endDate, adminChannelIds);

      } else if (aggregation === "yer" && parsedYear !== null) {
        const monthlyRevenue = [];
        for (let m = 0; m < 12; m++) {
          const monthStart = new Date(parsedYear, m, 1);
          const monthEnd = new Date(parsedYear, m + 1, 0);
          const revenue = await getTotalRevenue(monthStart, monthEnd, adminChannelIds);
          monthlyRevenue.push({ _id: monthArray[m], revenue: revenue });
        }
        dailyRevenue = monthlyRevenue;
      } else if (aggregation === "day" && startDate && endDate) {
        dailyRevenue = await getDailyRevenue(startDate, endDate, adminChannelIds);

      } else if (aggregation === "none") {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDate = new Date();
        dailyRevenue = await getDailyRevenue(startDate, endDate, adminChannelIds);

      } else {
        return res.status(400).json({ error: "Invalid aggregation or missing parameters" });
      }

      const [
        totalSubscribers,
        avgLifetimeValue,
        totalRevenue,
        totalRenewals,
        churnRate,
        revenueByChannel
      ] = await Promise.all([
        getTotalSubscribers(adminChannelIds),
        getAvgLifetimeValue(adminChannelIds, startDate, endDate),
        getTotalRevenue(startDate, endDate, adminChannelIds),
        getTotalRenewals(startDate, endDate, adminChannelIds),
        getChurnRate(startDate, endDate, adminChannelIds),
        getRevenueByChannel(startDate, endDate, adminChannelIds),
      ]);

      res.json({
        totalSubscribers,
        avgLifetimeValue,
        totalRevenue,
        totalRenewals,
        dailyRevenue,
        churnRate,
        revenueByChannel
      });
    } catch (err) {
      console.error("Error getting dashboard data:", err);
      res.status(500).send("Internal server error");
    }
  }
};


const getChannelTotalRevenue = async (channelId, startDate, endDate, planId) => {
  const match = {
    status: "captured",
    channel_id: new mongoose.Types.ObjectId(channelId),
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };
  if (planId) match.plan_id = new mongoose.Types.ObjectId(planId);

  const revenue = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
      },
    },
  ]);
  return revenue[0] ? revenue[0].totalRevenue : 0;
};

const getChannelTotalRenewals = async (channelId, startDate, endDate, planId) => {
  const match = {
    channel_id: new mongoose.Types.ObjectId(channelId),
    from_subscription_id: { $ne: null },
    start_date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };
  if (planId) match.plan_id = new mongoose.Types.ObjectId(planId);

  return await Subscription.countDocuments(match);
};

const getChannelSubscriptionMetrics = async (channelId, startDate, endDate, planId) => {
  const match = {
    channel_id: new mongoose.Types.ObjectId(channelId),
    start_date: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };
  if (planId) match.plan_id = new mongoose.Types.ObjectId(planId);

  return await Subscription.countDocuments(match);
};

const getChannelAvgLTV = async (channelId, planId, startDate, endDate) => {
  const match = {
    status: "captured",
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    channel_id: new mongoose.Types.ObjectId(channelId),
  };
  if (planId) match.plan_id = new mongoose.Types.ObjectId(planId);

  const transactions = await Transaction.find(match);
  const totalLifetimeValue = transactions.reduce((acc, txn) => {
    const price = txn.amount || 0
    return acc + price;
  }, 0);
  return transactions.length ? totalLifetimeValue / transactions.length : 0;
};

const getChannelDailyRevenue = async (channelId, startDate, endDate, planId) => {
  const match = {
    channel_id: new mongoose.Types.ObjectId(channelId),
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };
  if (planId) match.plan_id = new mongoose.Types.ObjectId(planId);

  return await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { "_id": 1 } }
  ]);
};
const getChannelTotalSubscribers = async (channelId, planId) => {
  const match = {
    status: "active",
    channel_id: new mongoose.Types.ObjectId(channelId),
  };
  if (planId) match.plan_id = new mongoose.Types.ObjectId(planId);

  return await Subscription.countDocuments(match);
};
const getPlanContributionData = async (channelId, startDate, endDate) => {
  const match = {
    channel_id: new mongoose.Types.ObjectId(channelId),
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$plan_id",
        totalRevenue: { $sum: "$amount" },
      },
    },
    {
      $lookup: {
        from: "plans",
        localField: "_id",
        foreignField: "_id",
        as: "plan",
      },
    },
    {
      $unwind: "$plan",
    },
    {
      $project: {
        _id: 0,
        planId: "$_id",
        planName: "$plan.name",
        totalRevenue: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return result;
};

// Controller
exports.AdminChannelDashboardController = {
  async getChannelDashboardData(req, res) {
    try {
      let { channel_id, start_date, end_date, plan_id, aggregation, year, month } = req.body;

      const parsedStartDate = start_date ? new Date(start_date) : null;
      const parsedEndDate = end_date ? new Date(end_date) : null;
      const parsedYear = year ? parseInt(year) : null;
      const parsedMonth = month ? parseInt(month) - 1 : null;

      let startDate = parsedStartDate;
      let endDate = parsedEndDate;
      let dailyRevenue = [];

      if (aggregation === "mon" && parsedYear !== null && parsedMonth !== null) {
        startDate = new Date(parsedYear, parsedMonth, 1);
        endDate = new Date(parsedYear, parsedMonth + 1, 0);
        dailyRevenue = await getChannelDailyRevenue(channel_id, startDate, endDate, plan_id);

      } else if (aggregation === "yer" && parsedYear !== null) {
        const monthlyRevenue = [];

        for (let m = 0; m < 12; m++) {
          const monthStart = new Date(parsedYear, m, 1);
          const monthEnd = new Date(parsedYear, m + 1, 0);
          const revenue = await getChannelTotalRevenue(channel_id, monthStart, monthEnd, plan_id);
          monthlyRevenue.push({ _id: monthArray[m], revenue: revenue });
        }

        dailyRevenue = monthlyRevenue;

      } else if (aggregation === "day" && startDate && endDate) {
        dailyRevenue = await getChannelDailyRevenue(channel_id, startDate, endDate, plan_id);

      } else if (aggregation === "none") {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDate = new Date();
        dailyRevenue = await getChannelDailyRevenue(channel_id, startDate, endDate, plan_id);

      } else {
        return res.status(400).json({ error: "Invalid aggregation or missing parameters" });
      }

      const [
        totalRevenue,
        totalRenewals,
        subscriptionCount,
        avgLTV,
        churnRate,
        totalSubscribers,
        planContribution
      ] = await Promise.all([
        getChannelTotalRevenue(channel_id, startDate, endDate, plan_id),
        getChannelTotalRenewals(channel_id, startDate, endDate, plan_id),
        getChannelSubscriptionMetrics(channel_id, startDate, endDate, plan_id),
        getChannelAvgLTV(channel_id, plan_id, startDate, endDate),
        getChurnRate(startDate, endDate, channel_id, plan_id),
        getChannelTotalSubscribers(channel_id, plan_id),
        getPlanContributionData(channel_id, startDate, endDate),
      ]);

      res.json({
        totalRevenue,
        totalRenewals,
        subscriptionCount,
        avgLTV,
        dailyRevenue,
        churnRate,
        totalSubscribers,
        planContribution,
      });
    } catch (err) {
      console.error("Error getting channel dashboard data:", err);
      res.status(500).send("Internal server error");
    }
  }
};

