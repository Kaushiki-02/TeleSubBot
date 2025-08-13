// routes/analyticsRoutes.js
const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
router.use(authMiddleware.protect);
router.get(
  "/dashboard-summary",
  authMiddleware.authorize("Analytics:read:dashboard"),
  analyticsController.getDashboardSummary
);
router.get(
  "/revenue",
  authMiddleware.authorize("Analytics:read:revenue"),
  analyticsController.getRevenue
);
router.get(
  "/subscription-metrics",
  authMiddleware.authorize("Analytics:read:subscription"),
  analyticsController.getSubscriptionMetrics
);
router.get(
  "/churn-rate",
  authMiddleware.authorize("Analytics:read:churn"),
  analyticsController.getChurnRate
);
router.get(
  "/ltv",
  authMiddleware.authorize("Analytics:read:ltv"),
  analyticsController.getCustomerLtv
);
// Use authorize with multiple permissions (checks if user has AT LEAST ONE)
router.get(
  "/link-conversion",
  authMiddleware.authorize(
    "Analytics:read:link:all",
    "Analytics:read:link:own"
  ),
  analyticsController.getLinkConversion
);
router.get(
  "/export",
  authMiddleware.authorize("Analytics:export"),
  analyticsController.exportReport
);

router.post("/admin/dashboard",
  authMiddleware.authorize("Analytics:read:dashboard"),
  analyticsController.AdminDashboardController.getDashboardData); // Pass the method, not the object
router.post("/admin/channel/dashboard",
  authMiddleware.authorize("Analytics:read:dashboard"),

  analyticsController.AdminChannelDashboardController.getChannelDashboardData); // Pass the method, not the object

module.exports = router;
