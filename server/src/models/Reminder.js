// models/Reminder.js
const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    subscription_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    scheduled_date: { type: Date, required: true, index: true }, // Date the subscription expires
    template_name: { type: String, required: true }, // Name of the ReminderTemplate used
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "delivered", "read"],
      default: "pending",
      index: true,
    },
    message_sid: { type: String, index: true }, // SID from the notification provider (e.g., Twilio)
    sent_at: { type: Date }, // Timestamp when the reminder was actually sent (or attempted)
    last_status_update_at: { type: Date }, // Timestamp of the last status update from webhook
    failure_reason: { type: String }, // Reason if status is 'failed'
  },
  { timestamps: true }
); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model("Reminder", reminderSchema);
