// utils/logger.js
let Log; // Lazy load model to avoid circular dependencies

const logAction = async (logData) => {
  try {
    // Ensure Log model is loaded
    if (!Log) Log = require("../models/Log");

    // Ensure actor_type is a string (it might be passed as role object)
    if (
      logData.actor_type &&
      typeof logData.actor_type === "object" &&
      logData.actor_type.name
    ) {
      logData.actor_type = logData.actor_type.name;
    }

    // Ensure IDs are correctly formatted if they are objects
    if (
      logData.actor_id &&
      typeof logData.actor_id === "object" &&
      logData.actor_id._id
    ) {
      logData.actor_id = logData.actor_id._id;
    }
    if (
      logData.target_id &&
      typeof logData.target_id === "object" &&
      logData.target_id._id
    ) {
      logData.target_id = logData.target_id._id;
    }

    // Create the log entry asynchronously
    await Log.create(logData);
  } catch (error) {
    // Log failure to the console, but don't crash the application
    console.error("DB Audit Log Failed:", error.message);
    // Log the data that failed to be saved for debugging
    console.error("Failed Log Data:", logData);
  }
};

module.exports = { logAction };
