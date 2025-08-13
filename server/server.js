// server.js
// Load .env file variables first
require("dotenv").config({ path: "./config.env" });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const os = require("os");
const path = require("path");

const connectDB = require("./src/config/db");
const AppError = require("./src/utils/appError");
const globalErrorHandler = require("./src/middleware/errorMiddleware");
// Import Routers
const authRoutes = require("./src/routes/authRoutes");
const webhookRoutes = require("./src/routes/webhookRoutes");

// Initialize Express App
const app = express();

// Connect to Database (Run this early, but doesn't need to block export)
connectDB();

// --- Middleware ---
app.use(cors());
app.options("*", cors());

if (process.env.NODE_ENV !== "production") {
  // Log in dev and test
  app.use(morgan("dev"));
}

// Define base API path
const apiBase = "/api/v1";

// MODIFIED: Apply raw body parser ONLY for the specific Razorpay webhook route *FIRST*
// This ensures req.rawBody is available for signature verification.

// MODIFIED: Apply standard JSON/URLencoded parsers *AFTER* the raw one
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// --- API Routes ---
app.use(`${apiBase}/auth`, authRoutes);
app.use(`${apiBase}/users`, require("./src/routes/userRoutes")); // Example inline require
app.use(`${apiBase}/roles`, require("./src/routes/roleRoutes"));
app.use(`${apiBase}/permissions`, require("./src/routes/permissionRoutes"));
app.use(`${apiBase}/settings`, require("./src/routes/settingRoutes"));
app.use(`${apiBase}/plans`, require("./src/routes/planRoutes"));
app.use(`${apiBase}/channels`, require("./src/routes/channelRoutes"));
app.use(`${apiBase}/links`, require("./src/routes/linkRoutes"));
app.use(`${apiBase}/subscriptions`, require("./src/routes/subscriptionRoutes"));
app.use(`${apiBase}/transactions`, require("./src/routes/transactionRoutes"));
app.use(`${apiBase}/reminders`, require("./src/routes/reminderRoutes"));
app.use(`${apiBase}/analytics`, require("./src/routes/analyticsRoutes"));
app.use(`${apiBase}/logs`, require("./src/routes/logRoutes"));
app.use(`${apiBase}/faqs`, require("./src/routes/faqRoutes"));
app.use(`${apiBase}/webhooks`, webhookRoutes); // Mounts handlers for other webhooks like /whatsapp/status

// Health Check Route
app.get(`${apiBase}/health`, (req, res) => {
  res.status(200).json({ status: "UP" });
});

// Handle Undefined Routes (Catch-all)
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

// --- Export the Express App Instance BEFORE starting the server ---
module.exports = app; // Use CommonJS export if server.js is CommonJS

// --- Start Server only if NOT in test environment ---
if (process.env.NODE_ENV !== "test") {
  // // Start Scheduled Jobs
  // require("./src/jobs/subscriptionJobs.cjs")


  // Start Server
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"
      } mode on port ${PORT}`
    );
  });

  // Handle Unhandled Rejections
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION! ðŸ’¥ Shutting down...");
    console.error(err.name, err.message, err.stack);
    server.close(() => {
      process.exit(1);
    });
  });

  // Handle SIGTERM
  process.on("SIGTERM", () => {
    console.log("ðŸ‘‹ SIGTERM RECEIVED. Shutting down gracefully");
    server.close(() => {
      console.log("ðŸ’¥ Process terminated!");
    });
  });
}
