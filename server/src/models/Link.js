// models/Link.js
const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema(
  {
    url_slug: { type: String, required: true, unique: true, index: true },
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    subid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Link", linkSchema);
