// models/Subscription.js
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    channel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    link_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Link",
      index: true,
      default: null,
    }, // Changed: not required
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "expired", "pending", "revoked", "kycSub"],
      default: "kycSub",
      index: true,
    },
    from_subscription_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    }, // Tracks original sub if this is a renewal
    telegramUser_id: String
  },
  { timestamps: true }
);

subscriptionSchema.index({ user_id: 1, channel_id: 1 }); // Compound index for user's subs per channel
subscriptionSchema.index({ status: 1, end_date: 1 }); // For expiry job

const User = require('./User'); // Import the User model

subscriptionSchema.post('save', async function (doc, next) {
  try {
    // Only update if the subscription is active
    if (doc.status === 'active') {
      await User.findByIdAndUpdate(
        doc.user_id,
        { $addToSet: { channels: doc.channel_id } } // $addToSet avoids duplicates
      );
    }
    next();
  } catch (err) {
    next(err);
  }
});
// Update expired subscriptions before find/findOne
async function updateExpiredSubscriptions(next) {
  try {
    const now = new Date();
    await mongoose.model("Subscription").updateMany(
      {
        status: { $in: ['active', 'pending', 'kycSub'] },
        end_date: { $lt: now }
      },
      {
        $set: { status: 'expired' }
      }
    );

    next();
  } catch (err) {
    next(err);
  }
}

subscriptionSchema.pre('find', updateExpiredSubscriptions);
subscriptionSchema.pre('findOne', updateExpiredSubscriptions);

module.exports = mongoose.model("Subscription", subscriptionSchema);
