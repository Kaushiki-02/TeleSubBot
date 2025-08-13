// models/Channel.js
const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    telegram_chat_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    description: { type: String, trim: true },
    associated_plan_ids: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    ],
    reminder_template_override_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReminderTemplate",
      default: null,
    },
    reminder_days_override: { type: Number, min: 0, default: 2 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Channel must have an owner (Admin)"],
    },
    referralCode: { type: String, index: { unique: true } },
    couponCode: {
      type: String
    },
    couponDiscount: { type: Number, min: 0, max: 100 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

channelSchema.pre("save", function (next) {
  const channel = this;
  if (!channel.referralCode) {
    // Function to generate a unique referral code
    const generateCode = () => {
      const codeLength = 6;
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let code = "";
      for (let i = 0; i < codeLength; i++) {
        code += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
      return code;
    };

    // Check for uniqueness and retry if necessary
    async function findUniqueCode() {
      let code = generateCode();
      const existingChannel = await Channel.findOne({ referralCode: code });
      if (!existingChannel) {
        channel.referralCode = code;
        return;
      }
      return findUniqueCode(); // Retry if code exists
    }

    findUniqueCode()
      .then(() => next())
      .catch(next);
  } else {
    next();
  }
});
const Channel = mongoose.model("Channel", channelSchema);
module.exports = Channel;
