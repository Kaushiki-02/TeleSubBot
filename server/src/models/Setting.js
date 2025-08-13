// models/Setting.js
const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      default: "string",
      enum: ["string", "number", "boolean", "json", "array"],
    }, // Added enum for clarity
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
