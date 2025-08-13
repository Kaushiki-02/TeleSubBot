// src/scripts/seed.js
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
    const mongoURI =
      process.env.NODE_ENV === "development"
        ? process.env.MONGO_URI
        : process.env.MONGO_URI_PROD;

    if (!mongoURI) {
      throw new Error("MongoDB URI not defined for the current environment.");
    }

    await mongoose.connect(mongoURI);
    console.log(
      `MongoDB (${
        process.env.NODE_ENV === "development" ? "Compass" : "Atlas"
      }) Connected for Mock Data Seeding...`
    );
    // Ensure hooks are registered (especially for referral codes and belongs_to validation)
    require("../models/Channel");
    require("../models/User"); // Ensure user hooks run
    require("../models/Link"); // Ensure link hooks run if any
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
    const superAdminRole = await Role.findOne({ name: "SuperAdmin" }); // Fetch SA role too

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
      "Deleting previous mock data (excluding Roles & Permissions, SuperAdmin User)..."
    );

    // Find the SuperAdmin user based on loginId or phone from .env
    const superAdminLoginId = process.env.SUPER_ADMIN_LOGIN_ID;
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE;

    let superAdminUser = null;
    if (superAdminLoginId) {
      superAdminUser = await User.findOne({ loginId: superAdminLoginId });
    }
    if (!superAdminUser && superAdminPhone) {
      superAdminUser = await User.findOne({ phone: superAdminPhone });
    }

    // Delete all users EXCEPT the found SuperAdmin (if found)
    const userFilterToDelete = superAdminUser
      ? { _id: { $ne: superAdminUser._id } }
      : {};
    await User.deleteMany(userFilterToDelete);

    // Re-seed SuperAdmin if they were accidentally deleted or not found (shouldn't happen if seed:core ran)
    if (!superAdminUser) {
      console.warn(
        "SuperAdmin user not found after deletion filter. Reseeding minimally via seed.js (consider fixing seed:core)."
      );
      const saRole = await Role.findOne({ name: "SuperAdmin" });
      if (saRole && (superAdminLoginId || superAdminPhone)) {
        superAdminUser = await User.create({
          phone: superAdminPhone,
          loginId: superAdminLoginId,
          password: superAdminPassword, // Password will be hashed by pre-save hook IF loginId is present
          role_id: saRole._id,
          otp_verified_at: new Date(),
          name: "Super Admin",
          channels: [],
          belongs_to: null,
        });
        console.log(`Reseeded SuperAdmin with ID: ${superAdminUser._id}`);
      } else {
        console.error(
          "CRITICAL: Cannot reseed SuperAdmin user - role not found or no login/phone provided."
        );
      }
    }

    await Channel.deleteMany({});
    await Plan.deleteMany({});
    await Subscription.deleteMany({});
    await Link.deleteMany({}); // Delete existing links
    await Transaction.deleteMany({});
    console.log("Previous mock data cleared.");

    // 3. Seed Admins (using loginId/password and setting phone to null)
    console.log("Seeding Admins...");
    const adminUsers = await User.create([
      {
        loginId: "admin1",
        password: "password", // This will be hashed by the pre-save hook
        role_id: adminRole._id,
        otp_verified_at: new Date(),
        name: "Admin One",
        channels: [],
        belongs_to: null, // Admins do not belong to anyone
      },
      {
        loginId: "admin2",
        password: "password",
        role_id: adminRole._id,
        otp_verified_at: new Date(),
        name: "Admin Two",
        channels: [],
        belongs_to: null,
      },
    ]);
    const admin1 = adminUsers.find((u) => u.loginId === "admin1");
    const admin2 = adminUsers.find((u) => u.loginId === "admin2");

    if (!admin1 || !admin2) throw new Error("Failed to seed Admin users.");
    console.log(`${adminUsers.length} Admins seeded.`);

    // 4. Seed Channels
    console.log("Seeding Channels...");
    const channelDocs = await Channel.create(
      [
        {
          name: "Admin1 Forex Signals",
          telegram_chat_id: "-1001111111111",
          owner: admin1._id,
          associated_plan_ids: [],
          is_active: true,
          description: "High-accuracy forex trading signals.",
        },
        {
          name: "Admin2 Crypto Alerts",
          telegram_chat_id: "-1002222222222",
          owner: admin2._id,
          associated_plan_ids: [],
          is_active: true,
          description: "Timely alerts for cryptocurrency movements.",
        },
        {
          name: "Admin2 Stock Insights (Inactive)",
          telegram_chat_id: "-1003333333333",
          owner: admin2._id,
          associated_plan_ids: [],
          is_active: false,
          description: "Insights and analysis for stock market.",
        },
        {
          name: "Admin1 Marketing Channel",
          telegram_chat_id: "-1004444444444",
          owner: admin1._id,
          associated_plan_ids: [],
          is_active: true,
          description: "Promotional channel for marketing.",
        },
      ],
      { runValidators: true }
    ); // No skipPreSave here, create() honors hooks

    const channelA = channelDocs.find(
      (c) => c.owner.equals(admin1._id) && c.name.includes("Forex")
    );
    const channelB = channelDocs.find(
      (c) => c.owner.equals(admin2._id) && c.name.includes("Crypto")
    );
    const channelC = channelDocs.find(
      (c) => c.owner.equals(admin2._id) && c.name.includes("Stock")
    );
    const channelD = channelDocs.find(
      (c) => c.owner.equals(admin1._id) && c.name.includes("Marketing")
    );

    if (!channelA || !channelB || !channelC || !channelD)
      throw new Error("Failed to seed Channel documents correctly.");
    console.log(`${channelDocs.length} Channels seeded.`);

    // 5. Link Channels back to Admins' User document (Admins 'own' these channels)
    const admin1Doc = await User.findById(admin1._id).select("+loginId");
    const admin2Doc = await User.findById(admin2._id).select("+loginId");

    if (!admin1Doc || !admin2Doc)
      throw new Error("Failed to refetch Admin docs for channel linking.");

    admin1Doc.channels = channelDocs
      .filter((c) => c.owner.equals(admin1._id))
      .map((c) => c._id);
    admin2Doc.channels = channelDocs
      .filter((c) => c.owner.equals(admin2._id))
      .map((c) => c._id);

    await admin1Doc.save();
    await admin2Doc.save();
    console.log("Channels linked to Admin users' 'channels' array.");

    // 6. Seed Plans
    console.log("Seeding Plans...");
    const plans = await Plan.create([
      {
        name: "Forex Basic Monthly",
        discounted_price: 499,
        markup_price: 699,
        validity_days: 30,
        is_active: true,
        channel_id: channelA._id,
        description: "Basic monthly access.",
      },
      {
        name: "Forex Yearly Premium",
        discounted_price: 4999,
        markup_price: 6999,
        validity_days: 365,
        is_active: true,
        channel_id: channelA._id,
        description: "Best value yearly access.",
      },
      {
        name: "Forex Inactive Offer",
        discounted_price: 199,
        validity_days: 15,
        is_active: false,
        channel_id: channelA._id,
        description: "Past special offer.",
      },
      {
        name: "Crypto Monthly",
        discounted_price: 399,
        validity_days: 30,
        is_active: true,
        channel_id: channelB._id,
        description: "Monthly crypto alerts.",
      },
      {
        name: "Crypto Quarterly Premium",
        discounted_price: 999,
        markup_price: 1299,
        validity_days: 90,
        
        is_active: true,
        channel_id: channelB._id,
        description: "Quarterly premium crypto alerts.",
      },
      {
        name: "Crypto Inactive Archived",
        discounted_price: 299,
        validity_days: 30,
        is_active: false,
        channel_id: channelB._id,
        description: "Old crypto plan.",
      },
      {
        name: "Stocks Monthly",
        discounted_price: 299,
        validity_days: 30,
        is_active: true,
        channel_id: channelC._id,
        description: "Monthly stock insights.",
      },
      {
        name: "Marketing Content Access",
        discounted_price: 0, // Free plan example
        validity_days: 30,
        is_active: true,
        channel_id: channelD._id,
        description: "Free access to marketing content.",
      },
    ]);
    const planForexBasicM = plans.find((p) => p.name === "Forex Basic Monthly");
    const planForexYPrem = plans.find((p) => p.name === "Forex Yearly Premium");
    const planCryptoM = plans.find((p) => p.name === "Crypto Monthly");
    const planCryptoQPrem = plans.find(
      (p) => p.name === "Crypto Quarterly Premium"
    );
    const planStocksM = plans.find((p) => p.name === "Stocks Monthly");
    const planMarketingFree = plans.find(
      (p) => p.name === "Marketing Content Access"
    );

    if (
      !planForexBasicM ||
      !planForexYPrem ||
      !planCryptoM ||
      !planCryptoQPrem ||
      !planStocksM ||
      !planMarketingFree
    )
      throw new Error("Failed to seed Plan documents correctly.");

    console.log(`${plans.length} Plans seeded.`);

    // 7. Associate Plans with Channels (Update Channel documents with Plan IDs)
    console.log("Associating Plans with Channels...");
    channelA.associated_plan_ids = plans
      .filter((p) => p.channel_id.equals(channelA._id))
      .map((p) => p._id);
    channelB.associated_plan_ids = plans
      .filter((p) => p.channel_id.equals(channelB._id))
      .map((p) => p._id);
    channelC.associated_plan_ids = plans
      .filter((p) => p.channel_id.equals(channelC._id))
      .map((p) => p._id);
    channelD.associated_plan_ids = plans
      .filter((p) => p.channel_id.equals(channelD._id))
      .map((p) => p._id);

    await channelA.save();
    await channelB.save();
    await channelC.save();
    await channelD.save();
    console.log("Plan IDs associated with channels.");

    // 8. Seed Users (Regular, Sales, Support)
    console.log("Seeding Users (Regular, Sales, Support)...");
    // Regular users still use phone login primarily
    const regularUsers = await User.create([
      {
        phone: "8888880001",
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "User One (TG Linked, KYC)",
        telegram_id: 111111111,
        telegram_username: "UserOneTG",
        telegramIdLinked: true,
        pan_number: "USERA1111A",
        aadhar_number: "111111111111",
        kyc_submitted_at: new Date(),
        channels: [], // Channels linked based on subscriptions later
      },
      {
        phone: "8888880002",
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "User Two (No TG, No KYC)",
        telegramIdLinked: false,
        channels: [],
      },
      {
        phone: "8888880003",
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "User Three (TG ID only, No KYC)",
        telegram_id: 333333333,
        telegramIdLinked: true,
        channels: [],
      },
    ]);
    const user1 = regularUsers.find((u) => u.phone === "8888880001");
    const user2 = regularUsers.find((u) => u.phone === "8888880002");
    const user3 = regularUsers.find((u) => u.phone === "8888880003");

    // Sales and Support users use loginId/password and belong_to an Admin
    const teamUsers = await User.create([
      {
        loginId: "sales1",
        password: "password",
        role_id: salesRole._id,
        otp_verified_at: new Date(), // Mark verified by SA creation
        name: "Sales Person One",
        belongs_to: admin1._id, // Belongs to Admin One
        channels: [], // Team members don't 'own' channels or have subscriber channels array by default
      },
      {
        loginId: "supportUser1",
        password: "password",
        role_id: supportRole._id,
        otp_verified_at: new Date(), // Mark verified by SA creation
        name: "Support Agent One",
        belongs_to: admin2._id, // Belongs to Admin Two
        channels: [],
      },
      {
        loginId: "support2",
        password: "password",
        role_id: supportRole._id,
        otp_verified_at: new Date(), // Mark verified by SA creation
        name: "Support Agent Two",
        belongs_to: admin1._id, // Belongs to Admin One
        channels: [],
      },
    ]);
    const salesUser1 = teamUsers.find((u) => u.loginId === "sales1");
    const supportUser1 = teamUsers.find((u) => u.loginId === "supportUser1");
    const supportUser2 = teamUsers.find((u) => u.loginId === "support2");

    if (
      !user1 ||
      !user2 ||
      !user3 ||
      !salesUser1 ||
      !supportUser1 ||
      !supportUser2
    )
      throw new Error("Failed to seed various User roles.");

    console.log(
      `${
        regularUsers.length + teamUsers.length
      } Users (Regular, Sales, Support) seeded.`
    );

    // 9. Seed Subscriptions
    console.log("Seeding Subscriptions...");
    const now = Date.now();
    const subscriptions = await Subscription.create([
      {
        user_id: user1._id,
        plan_id: planForexBasicM._id,
        channel_id: channelA._id,
        start_date: new Date(now - 10 * 86400000),
        end_date: new Date(now + 5 * 86400000),
        status: "active",
        telegramUser_id: String(user1.telegram_id), // Link to user's TG ID
      },
      {
        user_id: user1._id,
        plan_id: planForexYPrem._id,
        channel_id: channelA._id,
        start_date: new Date(now - 30 * 86400000),
        end_date: new Date(now + 335 * 86400000),
        status: "active",
        telegramUser_id: String(user1.telegram_id),
      },
      {
        user_id: user2._id,
        plan_id: planForexBasicM._id,
        channel_id: channelA._id,
        start_date: new Date(now - 60 * 86400000),
        end_date: new Date(now - 30 * 86400000),
        status: "expired",
        telegramUser_id: null, // User 2 has no TG linked in seed
      },
      {
        user_id: user3._id,
        plan_id: planCryptoM._id,
        channel_id: channelB._id,
        start_date: new Date(now - 20 * 86400000),
        end_date: new Date(now + 10 * 86400000),
        status: "active",
        telegramUser_id: String(user3.telegram_id),
      },
      {
        user_id: user3._id,
        plan_id: planCryptoQPrem._id,
        channel_id: channelB._id,
        start_date: new Date(now - 50 * 86400000),
        end_date: new Date(now + 40 * 86400000),
        status: "revoked",
        telegramUser_id: String(user3.telegram_id),
      },
      {
        user_id: user1._id,
        plan_id: planMarketingFree._id,
        channel_id: channelD._id,
        start_date: new Date(now - 5 * 86400000),
        end_date: new Date(now + 25 * 86400000),
        status: "active",
        telegramUser_id: String(user1.telegram_id),
      },
      // Add a sample active subscription for a Support user for testing Admin/SA views
      {
        user_id: supportUser1._id, // Support Agent 1
        plan_id: planCryptoM._id, // Subscribe them to a plan in Admin2's channel
        channel_id: channelB._id,
        start_date: new Date(now - 15 * 86400000),
        end_date: new Date(now + 15 * 86400000),
        status: "active",
        telegramUser_id: null, // Assuming Support user might not link TG as subscriber
      },
    ]);
    console.log(`${subscriptions.length} Subscriptions seeded.`);

    // 10. Explicitly update END users' 'channels' array based on ACTIVE subscriptions
    console.log(
      "Updating User roles' 'channels' array based on active subscriptions..."
    );
    const userActiveChannelMap = {};
    subscriptions.forEach((sub) => {
      // Only add channels for 'User' role subscribers found in the 'regularUsers' list
      const subscribingUser = regularUsers.find((u) =>
        u._id.equals(sub.user_id)
      );
      if (sub.status === "active" && subscribingUser) {
        const userIdStr = sub.user_id.toString();
        if (!userActiveChannelMap[userIdStr])
          userActiveChannelMap[userIdStr] = new Set();
        userActiveChannelMap[userIdStr].add(sub.channel_id.toString());
      }
    });
    for (const [userId, channelIdSet] of Object.entries(userActiveChannelMap)) {
      await User.findByIdAndUpdate(userId, {
        $set: { channels: Array.from(channelIdSet) },
      });
    }
    console.log("End user 'channels' arrays updated based on active subs.");

    // 11. Seed Links (Must include subid as per Link.js model)
    console.log("Seeding Links...");
    // Filter subscriptions to only include those with a valid user_id and channel_id
    // and specifically target those we want to link.
    const subscriptionsToLink = subscriptions.filter(
      (sub) =>
        sub.user_id &&
        sub.channel_id &&
        // Only link certain subscriptions for demo purposes
        (sub.user_id.equals(user1._id) || sub.user_id.equals(user3._id)) &&
        sub.status === "active" // Only link active subscriptions
    );

    const linkDocs = await Link.create(
      [
        // Link to User1's Active Forex Basic subscription
        {
          url_slug: "user1-forex-basic",
          channel_id: subscriptions.find(
            (sub) =>
              sub.user_id.equals(user1._id) &&
              sub.plan_id.equals(planForexBasicM._id)
          )?.channel_id,
          subid: subscriptions.find(
            (sub) =>
              sub.user_id.equals(user1._id) &&
              sub.plan_id.equals(planForexBasicM._id)
          )?._id,
        },
        // Link to User3's Active Crypto Monthly subscription
        {
          url_slug: "user3-crypto-monthly",
          channel_id: subscriptions.find(
            (sub) =>
              sub.user_id.equals(user3._id) &&
              sub.plan_id.equals(planCryptoM._id)
          )?.channel_id,
          subid: subscriptions.find(
            (sub) =>
              sub.user_id.equals(user3._id) &&
              sub.plan_id.equals(planCryptoM._id)
          )?._id,
        },
        // Link to User1's Free Marketing subscription
        {
          url_slug: "user1-marketing-free",
          channel_id: subscriptions.find(
            (sub) =>
              sub.user_id.equals(user1._id) &&
              sub.plan_id.equals(planMarketingFree._id)
          )?.channel_id,
          subid: subscriptions.find(
            (sub) =>
              sub.user_id.equals(user1._id) &&
              sub.plan_id.equals(planMarketingFree._id)
          )?._id,
        },
        // As per Link.js model (url_slug, channel_id, subid), these are the only fields.
        // Removed name, created_by, campaign_tag, expires_at, usage_cap from Link seeding based on model.
        // This contradicts the linkController, which is an existing inconsistency in your codebase.
        // Pointing out this potential issue but seeding based on the model.
        // Also, all links must have a valid subid that corresponds to an existing subscription.
      ].filter((link) => link.subid !== undefined)
    ); // Filter out any links where subid couldn't be found from the seeded subs

    console.log(`${linkDocs.length} Links seeded.`);

    // 12. Seed Transactions
    console.log("Seeding Transactions...");
    const createTxn = (
      userId,
      planId,
      channelId,
      amount,
      subId = null,
      status = "captured",
      createdAt = new Date(),
      linkId = null // Added linkId field as per Transaction model & controller usage
    ) => ({
      user_id: userId,
      plan_id: planId,
      channel_id: channelId,
      amount,
      currency: "INR",
      razorpay_order_id: `order_${Date.now()}${Math.random()
        .toString(36)
        .substring(2, 8)}`,
      razorpay_payment_id:
        status === "captured"
          ? `pay_${Date.now()}${Math.random().toString(36).substring(2, 8)}`
          : null,
      status,
      subscription_id: subId,
      createdAt,
      link_id: linkId, // Add linkId to transaction if applicable
    });

    const transactions = await Transaction.create(
      [
        // User 1 Transactions
        createTxn(
          user1._id,
          planForexBasicM._id,
          channelA._id,
          499,
          subscriptions.find(
            (sub) =>
              sub.user_id.equals(user1._id) &&
              sub.plan_id.equals(planForexBasicM._id)
          )?._id,
          "captured",
          new Date(now - 10 * 86400000), // Match sub start date
          linkDocs.find((l) => l.url_slug === "user1-forex-basic")?._id // Link to corresponding link
        ),
        createTxn(
          user1._id,
          planForexYPrem._id,
          channelA._id,
          4999,
          subscriptions.find(
            (sub) =>
              sub.user_id.equals(user1._id) &&
              sub.plan_id.equals(planForexYPrem._id)
          )?._id,
          "captured",
          new Date(now - 30 * 86400000) // Match sub start date
        ),
        createTxn(
          user1._id,
          planMarketingFree._id,
          channelD._id,
          0,
          subscriptions.find(
            (sub) =>
              sub.user_id.equals(user1._id) &&
              sub.plan_id.equals(planMarketingFree._id)
          )?._id,
          "captured",
          new Date(now - 5 * 86400000) // Match sub start date
        ),
        // User 2 Transactions (Expired)
        createTxn(
          user2._id,
          planForexBasicM._id,
          channelA._id,
          499,
          subscriptions.find(
            (sub) =>
              sub.user_id.equals(user2._id) &&
              sub.plan_id.equals(planForexBasicM._id) &&
              sub.status === "expired"
          )?._id,
          "captured",
          new Date(now - 60 * 86400000) // Match sub start date
        ),
        // User 3 Transactions (Active & Revoked)
        createTxn(
          user3._id,
          planCryptoM._id,
          channelB._id,
          399,
          subscriptions.find(
            (sub) =>
              sub.user_id.equals(user3._id) &&
              sub.plan_id.equals(planCryptoM._id) &&
              sub.status === "active"
          )?._id,
          "captured",
          new Date(now - 20 * 86400000), // Match sub start date
          linkDocs.find((l) => l.url_slug === "user3-crypto-monthly")?._id
        ),
        createTxn(
          user3._id,
          planCryptoQPrem._id,
          channelB._id,
          999,
          subscriptions.find(
            (sub) =>
              sub.user_id.equals(user3._id) &&
              sub.plan_id.equals(planCryptoQPrem._id) &&
              sub.status === "revoked"
          )?._id,
          "captured",
          new Date(now - 50 * 86400000) // Match sub start date
        ),
        // Sample Failed Transaction
        createTxn(
          user2._id,
          planForexBasicM._id,
          channelA._id,
          499,
          null,
          "failed",
          new Date(now - 1 * 86400000)
        ),
        // Sample Created Transaction (pending)
        createTxn(
          user1._id,
          planForexYPrem._id,
          channelA._id,
          4999,
          null,
          "created",
          new Date(now - 0.5 * 86400000)
        ),
        // Sample Transaction for Support User's Subscription
        createTxn(
          supportUser1._id,
          planCryptoM._id,
          channelB._id,
          399,
          subscriptions.find((sub) => sub.user_id.equals(supportUser1._id))
            ?._id,
          "captured",
          new Date(now - 15 * 86400000)
        ),
      ].filter(
        (tx) =>
          tx.user_id && tx.plan_id && tx.channel_id && tx.subid !== undefined
      )
    ); // Ensure required fields + linked subid exist

    console.log(`${transactions.length} Transactions seeded.`);

    // 13. Optional: Link last transaction back to subscriptions if needed for convenience
    // This is handled by the activateSubscription function. For seeded data,
    // we can manually set `last_transaction_id` on the subscriptions.
    console.log("Linking last transaction IDs to subscriptions...");
    for (const tx of transactions) {
      if (tx.subscription_id && tx.status === "captured") {
        // Only link captured txns
        // Find the subscription and check if this transaction is newer than the current last_transaction_id
        const sub = await Subscription.findById(tx.subscription_id).select(
          "last_transaction_id createdAt"
        );
        if (sub) {
          let currentLastTxnDate = null;
          if (sub.last_transaction_id) {
            const currentLastTxn = await Transaction.findById(
              sub.last_transaction_id
            ).select("createdAt");
            if (currentLastTxn) currentLastTxnDate = currentLastTxn.createdAt;
          }

          if (!currentLastTxnDate || tx.createdAt > currentLastTxnDate) {
            await Subscription.findByIdAndUpdate(sub._id, {
              last_transaction_id: tx._id,
            });
          }
        }
      }
    }
    console.log("Last transaction IDs updated on subscriptions.");

    console.log("--- Mock Data Seeding Completed Successfully ---");
  } catch (error) {
    console.error("Error during mock data seeding process:", error);
    process.exitCode = 1; // Indicate failure
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

seedMockData();
