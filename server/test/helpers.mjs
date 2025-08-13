// test/helpers.mjs
import User from "../src/models/User.js";
import Role from "../src/models/Role.js";
import jwtHelper from "../src/utils/jwtHelper.js";
import mongoose from "mongoose";

const loginUser = async (roleName, phoneSuffix = "") => {
  try {
    const role = await Role.findOne({ name: roleName }).lean();
    if (!role) {
      throw new Error(
        `Test setup error: Role '${roleName}' not found. Run seed script.`
      );
    }

    const basePhone = process.env.TEST_USER_BASE_PHONE || "+9199999";
    // Generate a unique phone number part
    const timePart = Date.now().toString().slice(-5); 
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, "0"); 
    const suffixDigits = phoneSuffix.replace(/\D/g, "");
    let uniqueDigits = `${suffixDigits}${timePart}${randomPart}`;
    const phonePrefixLength = basePhone.length;
    const maxUniqueDigits = 15 - phonePrefixLength; // Max length for E.164 is 15 digits + '+'
    uniqueDigits = uniqueDigits.slice(-maxUniqueDigits); 
    let phone = `${basePhone}${uniqueDigits}`;

    // Generate a unique fake telegram_id to avoid E11000 for null/duplicates if not unique
    const fakeTelegramId = Math.floor(Date.now() * Math.random()) + 1000000; 

    let user = await User.findOne({ phone: phone });

    if (!user) {
      user = await User.create({
        phone: phone,
        role_id: role._id,
        otp_verified_at: new Date(), // Mark as verified for tests
        name: `${roleName} Test ${phoneSuffix || ""}`.trim(),
        telegram_id: fakeTelegramId, 
      });
    } else {
      // Ensure existing test user has correct role and is verified
      if (!user.role_id.equals(role._id)) {
          user.role_id = role._id;
      }
      user.otp_verified_at = user.otp_verified_at || new Date();
      user.telegram_id = user.telegram_id || fakeTelegramId; // Assign if missing
      await user.save();
    }

    const token = jwtHelper.signToken(user._id, role.name);
    // Return a plain JS object for the user, including populated role if needed later
    const userObject = await User.findById(user._id).populate('role_id').lean(); 

    if (!userObject) {
      throw new Error(`Failed to get user object for ${phone}`);
    }

    return { token, user: userObject };
  } catch (error) {
    console.error(`Error in loginUser helper for role ${roleName} & suffix ${phoneSuffix}:`, error);
    throw error;
  }
};

/**
 * Helper to seed data for a specific model.
 * @param {mongoose.Model} Model - The Mongoose model.
 * @param {Array<object>|object} data - The data to insert.
 * @returns {Promise<Array<mongoose.Document>|mongoose.Document>}
 */
const seedData = async (Model, data) => {
  try {
    // Add default razorpay_order_id if seeding Transactions
    if (Model.modelName === 'Transaction') {
        const addOrderId = (item) => ({
            ...item,
            razorpay_order_id: item.razorpay_order_id || `test_order_${Date.now()}${Math.random()}`
        });
        if (Array.isArray(data)) {
            data = data.map(addOrderId);
        } else {
            data = addOrderId(data);
        }
    }
    const createdDocs = await Model.create(data);
    return createdDocs;
  } catch (error) {
    console.error(`Error seeding data into ${Model.collection.name}:`, error);
    throw error;
  }
};

/**
 * Helper to create a valid ObjectId string or return null/undefined
 * @param {string|ObjectId|null|undefined} id
 * @returns {string|null|undefined}
 */
const getObjectIdString = (id) => {
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    return id.toString();
  }
  return id; // Return original if null/undefined/invalid
};

export { loginUser, seedData, getObjectIdString };
