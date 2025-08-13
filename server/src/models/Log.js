// models/Log.js
const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    actor_type: {
      type: String,
      required: true,
      enum: ["System", "User", "SuperAdmin", "Admin", "Sales", "Support"],
    },
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action_type: { type: String, required: true, index: true },
    target_type: { type: String },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    description: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: false, collection: "audit_logs" }
);

module.exports = mongoose.model("Log", logSchema);
