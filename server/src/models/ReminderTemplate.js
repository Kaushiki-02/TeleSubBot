// models/ReminderTemplate.js
const mongoose = require("mongoose");

const reminderTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["pre-expiry", "custom"],
      default: "custom",
      required: true,
    },
    days_before_expiry: {
      type: Number,
      min: 0,
      validate: {
        // Required only if type is 'pre-expiry'
        validator: function (v) {
          return this.type !== "pre-expiry" || (Number.isInteger(v) && v >= 0);
        },
        message:
          "Days before expiry is required and must be a non-negative integer for pre-expiry templates.",
      },
      default: 2,
    },
    is_default: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Ensure only one default template exists per type (specifically 'pre-expiry')
// This validation needs to be handled at the application level (controller) before saving/updating,
// as schema-level validation cannot easily query other documents.

module.exports = mongoose.model("ReminderTemplate", reminderTemplateSchema);
