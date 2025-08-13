// models/FAQ.js
const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    display_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    language: { type: String, default: "en", lowercase: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

faqSchema.index({ is_active: 1, display_order: 1, language: 1 });
module.exports = mongoose.model("FAQ", faqSchema);
