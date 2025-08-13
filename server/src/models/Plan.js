// models/Plan.js
const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    markup_price: {
      type: Number,
      min: 0,
      required: true,

    },
    discounted_price: {
      type: Number,
      default: null,
      validator: function (v) {
        if (v === null || v === undefined) {
          return true;
        }
        // If v is a number, validation fails *only if* v < this.discounted_price
        // Also ensure discounted_price exists and is a number for comparison
        if (
          typeof v === "number" &&
          typeof this.markup_price === "number"
        ) {
          return v <= this.markup_price;
        }
        // For any other type of v (shouldn't happen with schema type), let other validation handle it, assume valid here.
        return true;
      },
    },
    validity_days: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Validity days must be an integer.",
      },
    },
    description: { type: String, trim: true },
    is_active: { type: Boolean, default: true, index: true },
    channel_id: {
      required: true,
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      ref: "Channel",
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

planSchema.virtual("discount_percentage").get(function () {
  if (
    this.markup_price !== null &&
    this.markup_price !== undefined &&
    this.markup_price > 0 &&
    this.discounted_price < this.markup_price
  ) {
    return Math.round(
      ((this.markup_price - this.discounted_price) / this.markup_price) * 100
    );
  }
  return 0;
});

const Plan = mongoose.model("Plan", planSchema);
module.exports = Plan;