// models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscription_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
      default: null,
    }, // Link to the activated/renewed/upgraded subscription
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, required: true },
    razorpay_order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpay_payment_id: { type: String, index: true, default: null },
    razorpay_invoice_id: { type: String, default: null }, // Optional: If Razorpay generates an invoice
    status: {
      type: String,
      required: true,
      enum: ["created", "authorized", "captured", "failed"],
      default: "created",
      index: true,
    },
    invoice_url: { type: String, default: null }, // Optional: Custom invoice URL if generated separately
  },
  { timestamps: true }
);

transactionSchema.index({ status: 1, createdAt: -1 }); // For filtering/sorting transactions
module.exports = mongoose.model("Transaction", transactionSchema);
