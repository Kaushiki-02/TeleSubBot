// Seeds mock Admins, Channels, Plans, Users, Subscriptions, Links, Transactions.
// Assumes seedCore.js has been run first.
require("dotenv").config({
    path: require("path").resolve(__dirname, "../../config.env"),
});
const mongoose = require("mongoose");
const Role = require("../models/Role");
const User = require("../models/User");
const Channel = require("../models/Channel");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Link = require("../models/Link");
const Transaction = require("../models/Transaction");

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        const conn = await mongoose.connect(process.env.NODE_ENV === 'development' ? process.env.MONGO_URI : process.env.MONGO_URI_PROD);
        console.log("MongoDB Connected for Mock Data Seeding...");
        // Ensure hooks are registered if they weren't already (though require should do this)
        require("../models/Channel");
        require("../models/User"); // Ensure user hooks for referral code also processed
    } catch (err) {
        console.error("Error connecting to MongoDB for mock seeding:", err.message);
        process.exit(1);
    }
};

const seedMockData = async () => {
    await connectDB();
    try {
        console.log("--- Starting Mock Data Seed ---");

        // 1. Fetch Required Role IDs (must exist from seedCore)
        const adminRole = await Role.findOne({ name: "Admin" });
        const userRole = await Role.findOne({ name: "User" });
        const salesRole = await Role.findOne({ name: "Sales" });
        const supportRole = await Role.findOne({ name: "Support" });
        const superAdminRole = await Role.findOne({ name: "SuperAdmin" });

        if (
            !adminRole ||
            !userRole ||
            !superAdminRole ||
            !salesRole ||
            !supportRole
        ) {
            throw new Error(
                "Core roles ('Admin', 'User', 'Sales', 'Support', 'SuperAdmin') not found. Run `npm run seed:core` first."
            );
        }

        // 2. Clean Previous Mock Data (Keep Roles, Permissions, SuperAdmin User)
        console.log(
            "Deleting previous mock data (Channels, Plans, Links, Subs, Transactions, Users [non-SA])..."
        );
        const superAdminlogin = process.env.SUPER_ADMIN_LOGIN_ID;
        // Filter to keep the SuperAdmin user if their phone is configured
        const userFilter = superAdminlogin
            ? { loginId: { $ne: superAdminlogin } }
            : {};

        await Channel.deleteMany({});
        await Plan.deleteMany({});
        await Subscription.deleteMany({});
        await Link.deleteMany({});
        await Transaction.deleteMany({});
        await User.deleteMany(userFilter); // Delete all users EXCEPT the SuperAdmin
    } catch (error) {
        console.error("Error during mock data seeding process:", error);
        process.exitCode = 1; // Indicate failure
    } finally {
        await mongoose.disconnect();
        console.log("MongoDB disconnected.");
    }
}

seedMockData()