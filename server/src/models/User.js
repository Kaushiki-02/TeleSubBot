// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    loginId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      select: false,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    phone: {
      type: String,
      required: function () {
        return !this.loginId;
      },
      unique: true,
      index: true,
      sparse: true,
      match: [/^\d{10}$/, "Invalid phone number"],
    },
    otp: { type: String, select: false },
    otp_expires: { type: Date, select: false },
    otp_verified_at: { type: Date, default: null },
    last_login_at: { type: Date },
    pan_number: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    aadhar_number: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    kyc_submitted_at: { type: Date, default: null },
    telegram_id: {
      type: Number,
      index: true,
      unique: true,
      sparse: true,
    },
    telegram_username: {
      type: String,
      unique: true,
      sparse: true,
    },
    telegramIdLinked: { type: Boolean, default: false },
    date_of_birth: {
      type: Date,
    },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    channels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Channel",
      },
    ],
    referralCode: {
      type: String,
      index: { unique: true },
    },
    belongs_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Add validation to ensure phone is required if loginId is not present
userSchema.path("phone").validate(function (value) {
  // Only apply this validation if loginId is not set or is null
  if (this.loginId === null || this.loginId === undefined) {
    return value !== null && value !== undefined && value.trim() !== "";
  }
  return true; // If loginId is set, phone is optional (SuperAdmin case)
}, "Phone number is required unless Login ID is provided.");

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  next();
});
userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update?.password) {
    update.password = await bcrypt.hash(update.password, 12);
    this.setUpdate(update);
  }
  next();
});

userSchema.pre("updateOne", async function (next) {
  const update = this.getUpdate();
  if (update?.password) {
    update.password = await bcrypt.hash(update.password, 12);
    this.setUpdate(update);
  }
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.pre("save", function (next) {
  const user = this;
  if (!user.referralCode) {
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
      const existingUser = await User.findOne({ referralCode: code });
      if (!existingUser) {
        user.referralCode = code;
        return;
      }
      return findUniqueCode(); // Retry if code exists
    }

    findUniqueCode().then(() => next());
  } else {
    next();
  }
});
const User = mongoose.model("User", userSchema);

module.exports = User;
