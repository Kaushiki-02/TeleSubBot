// src/scripts/enhancedSeed.js
// Enhanced seeding script with comprehensive test data for full project analysis
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
const FAQ = require("../models/FAQ");
const Setting = require("../models/Setting");
const Log = require("../models/Log");

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    const mongoURI = process.env.NODE_ENV === "development" 
      ? process.env.MONGO_URI 
      : process.env.MONGO_URI_PROD;
    
    if (!mongoURI) {
      throw new Error("MongoDB URI not defined for the current environment.");
    }

    await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected for Enhanced Seeding...`);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  }
};

const seedEnhancedData = async () => {
  await connectDB();
  try {
    console.log("--- Starting Enhanced Data Seed ---");

    // 1. Fetch Required Role IDs
    const adminRole = await Role.findOne({ name: "Admin" });
    const userRole = await Role.findOne({ name: "User" });
    const salesRole = await Role.findOne({ name: "Sales" });
    const supportRole = await Role.findOne({ name: "Support" });
    const superAdminRole = await Role.findOne({ name: "SuperAdmin" });

    if (!adminRole || !userRole || !superAdminRole || !salesRole || !supportRole) {
      throw new Error("Core roles not found. Run seedCore.js first.");
    }

    // 2. Clean Previous Data (Keep Roles, Permissions, SuperAdmin)
    console.log("Cleaning previous data...");
    const superAdminUser = await User.findOne({ role_id: superAdminRole._id });
    const userFilterToDelete = superAdminUser ? { _id: { $ne: superAdminUser._id } } : {};
    
    await User.deleteMany(userFilterToDelete);
    await Channel.deleteMany({});
    await Plan.deleteMany({});
    await Subscription.deleteMany({});
    await Link.deleteMany({});
    await Transaction.deleteMany({});
    await FAQ.deleteMany({});
    await Setting.deleteMany({});
    await Log.deleteMany({});

    // 3. Seed Enhanced Admin Users
    console.log("Seeding Enhanced Admin Users...");
    const adminUsers = await User.create([
      {
        loginId: "admin1",
        password: "password123",
        role_id: adminRole._id,
        otp_verified_at: new Date(),
        name: "John Admin - Forex Expert",
        channels: [],
        belongs_to: null,
        email: "john.admin@rigi.com",
        phone: "9876543210"
      },
      {
        loginId: "admin2", 
        password: "password123",
        role_id: adminRole._id,
        otp_verified_at: new Date(),
        name: "Sarah Admin - Crypto Specialist",
        channels: [],
        belongs_to: null,
        email: "sarah.admin@rigi.com",
        phone: "9876543211"
      },
      {
        loginId: "admin3",
        password: "password123", 
        role_id: adminRole._id,
        otp_verified_at: new Date(),
        name: "Mike Admin - Stock Analyst",
        channels: [],
        belongs_to: null,
        email: "mike.admin@rigi.com",
        phone: "9876543212"
      }
    ]);

    // 4. Seed Enhanced Channels
    console.log("Seeding Enhanced Channels...");
    const channels = await Channel.create([
      {
        name: "Forex Pro Signals",
        telegram_chat_id: "-1001111111111",
        owner: adminUsers[0]._id,
        associated_plan_ids: [],
        is_active: true,
        description: "Professional forex trading signals with 90% accuracy",
        category: "Forex",
        member_count: 1250,
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // 6 months ago
      },
      {
        name: "Crypto Elite Alerts",
        telegram_chat_id: "-1002222222222", 
        owner: adminUsers[1]._id,
        associated_plan_ids: [],
        is_active: true,
        description: "Premium cryptocurrency trading alerts and analysis",
        category: "Cryptocurrency",
        member_count: 890,
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) // 4 months ago
      },
      {
        name: "Stock Market Insights",
        telegram_chat_id: "-1003333333333",
        owner: adminUsers[2]._id,
        associated_plan_ids: [],
        is_active: true,
        description: "Comprehensive stock market analysis and recommendations",
        category: "Stocks",
        member_count: 650,
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 3 months ago
      },
      {
        name: "Commodity Trading",
        telegram_chat_id: "-1004444444444",
        owner: adminUsers[0]._id,
        associated_plan_ids: [],
        is_active: true,
        description: "Gold, silver, oil and other commodity trading signals",
        category: "Commodities",
        member_count: 420,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 2 months ago
      },
      {
        name: "Options Trading Pro",
        telegram_chat_id: "-1005555555555",
        owner: adminUsers[2]._id,
        associated_plan_ids: [],
        is_active: true,
        description: "Advanced options trading strategies and signals",
        category: "Options",
        member_count: 280,
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 1.5 months ago
      }
    ]);

    // 5. Seed Enhanced Plans
    console.log("Seeding Enhanced Plans...");
    const plans = await Plan.create([
      // Forex Plans
      {
        name: "Forex Basic - Monthly",
        discounted_price: 999,
        markup_price: 1499,
        validity_days: 30,
        is_active: true,
        channel_id: channels[0]._id,
        description: "Basic monthly forex signals",
        features: ["Daily signals", "Basic analysis", "Email support"],
        max_subscribers: 1000
      },
      {
        name: "Forex Premium - Quarterly", 
        discounted_price: 2499,
        markup_price: 3999,
        validity_days: 90,
        is_active: true,
        channel_id: channels[0]._id,
        description: "Premium quarterly forex package",
        features: ["Priority signals", "Advanced analysis", "24/7 support", "Risk management"],
        max_subscribers: 500
      },
      {
        name: "Forex Elite - Yearly",
        discounted_price: 8999,
        markup_price: 14999,
        validity_days: 365,
        is_active: true,
        channel_id: channels[0]._id,
        description: "Elite yearly forex membership",
        features: ["VIP signals", "Personal consultation", "Portfolio review", "Exclusive tools"],
        max_subscribers: 200
      },
      // Crypto Plans
      {
        name: "Crypto Starter - Monthly",
        discounted_price: 799,
        markup_price: 1199,
        validity_days: 30,
        is_active: true,
        channel_id: channels[1]._id,
        description: "Monthly crypto trading alerts",
        features: ["Daily alerts", "Market updates", "Basic education"],
        max_subscribers: 800
      },
      {
        name: "Crypto Pro - Quarterly",
        discounted_price: 1999,
        markup_price: 2999,
        validity_days: 90,
        is_active: true,
        channel_id: channels[1]._id,
        description: "Professional crypto trading package",
        features: ["Real-time alerts", "Technical analysis", "Portfolio tracking", "Community access"],
        max_subscribers: 400
      },
      // Stock Plans
      {
        name: "Stock Basic - Monthly",
        discounted_price: 699,
        markup_price: 999,
        validity_days: 30,
        is_active: true,
        channel_id: channels[2]._id,
        description: "Monthly stock market insights",
        features: ["Weekly picks", "Market analysis", "Educational content"],
        max_subscribers: 600
      },
      {
        name: "Stock Premium - Quarterly",
        discounted_price: 1799,
        markup_price: 2499,
        validity_days: 90,
        is_active: true,
        channel_id: channels[2]._id,
        description: "Premium stock trading package",
        features: ["Daily picks", "Risk assessment", "Portfolio optimization", "Expert consultation"],
        max_subscribers: 300
      }
    ]);

    // 6. Update Channels with Plan IDs
    channels[0].associated_plan_ids = plans.filter(p => p.channel_id.equals(channels[0]._id)).map(p => p._id);
    channels[1].associated_plan_ids = plans.filter(p => p.channel_id.equals(channels[1]._id)).map(p => p._id);
    channels[2].associated_plan_ids = plans.filter(p => p.channel_id.equals(channels[2]._id)).map(p => p._id);
    
    await Promise.all(channels.map(c => c.save()));

    // 7. Seed Enhanced Users
    console.log("Seeding Enhanced Users...");
    const users = await User.create([
      // Premium Users
      {
        phone: "8888880001",
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "Alex Johnson - Premium Trader",
        telegram_id: 111111111,
        telegram_username: "alex_trader",
        telegramIdLinked: true,
        pan_number: "ALEXJ1111A",
        aadhar_number: "111111111111",
        kyc_submitted_at: new Date(),
        channels: [],
        email: "alex.johnson@email.com",
        created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000)
      },
      {
        phone: "8888880002", 
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "Priya Sharma - Crypto Enthusiast",
        telegram_id: 222222222,
        telegram_username: "priya_crypto",
        telegramIdLinked: true,
        pan_number: "PRIYS2222B",
        aadhar_number: "222222222222",
        kyc_submitted_at: new Date(),
        channels: [],
        email: "priya.sharma@email.com",
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
      },
      {
        phone: "8888880003",
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "David Chen - Stock Investor",
        telegram_id: 333333333,
        telegram_username: "david_stocks",
        telegramIdLinked: true,
        pan_number: "DAVID3333C",
        aadhar_number: "333333333333",
        kyc_submitted_at: new Date(),
        channels: [],
        email: "david.chen@email.com",
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      },
      // Regular Users
      {
        phone: "8888880004",
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "Maria Garcia - New Trader",
        telegram_id: 444444444,
        telegram_username: "maria_trader",
        telegramIdLinked: true,
        channels: [],
        email: "maria.garcia@email.com",
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      },
      {
        phone: "8888880005",
        role_id: userRole._id,
        otp_verified_at: new Date(),
        name: "Raj Patel - Beginner",
        telegram_id: 555555555,
        telegram_username: "raj_beginner",
        telegramIdLinked: true,
        channels: [],
        email: "raj.patel@email.com",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    ]);

    // 8. Seed Team Members
    const teamMembers = await User.create([
      {
        loginId: "sales1",
        password: "password123",
        role_id: salesRole._id,
        otp_verified_at: new Date(),
        name: "Emma Sales - Senior Sales",
        belongs_to: adminUsers[0]._id,
        channels: [],
        email: "emma.sales@rigi.com",
        phone: "9876543220"
      },
      {
        loginId: "sales2", 
        password: "password123",
        role_id: salesRole._id,
        otp_verified_at: new Date(),
        name: "Carlos Sales - Crypto Specialist",
        belongs_to: adminUsers[1]._id,
        channels: [],
        email: "carlos.sales@rigi.com",
        phone: "9876543221"
      },
      {
        loginId: "support1",
        password: "password123",
        role_id: supportRole._id,
        otp_verified_at: new Date(),
        name: "Lisa Support - Technical Support",
        belongs_to: adminUsers[0]._id,
        channels: [],
        email: "lisa.support@rigi.com",
        phone: "9876543222"
      },
      {
        loginId: "support2",
        password: "password123", 
        role_id: supportRole._id,
        otp_verified_at: new Date(),
        name: "Ahmed Support - Customer Success",
        belongs_to: adminUsers[1]._id,
        channels: [],
        email: "ahmed.support@rigi.com",
        phone: "9876543223"
      }
    ]);

    // 9. Seed Enhanced Subscriptions
    console.log("Seeding Enhanced Subscriptions...");
    const now = Date.now();
    const subscriptions = await Subscription.create([
      // Alex's Subscriptions
      {
        user_id: users[0]._id,
        plan_id: plans[2]._id, // Forex Elite Yearly
        channel_id: channels[0]._id,
        start_date: new Date(now - 180 * 86400000),
        end_date: new Date(now + 185 * 86400000),
        status: "active",
        telegramUser_id: String(users[0].telegram_id),
        created_at: new Date(now - 180 * 86400000)
      },
      {
        user_id: users[0]._id,
        plan_id: plans[4]._id, // Crypto Pro Quarterly
        channel_id: channels[1]._id,
        start_date: new Date(now - 60 * 86400000),
        end_date: new Date(now + 30 * 86400000),
        status: "active",
        telegramUser_id: String(users[0].telegram_id),
        created_at: new Date(now - 60 * 86400000)
      },
      // Priya's Subscriptions
      {
        user_id: users[1]._id,
        plan_id: plans[4]._id, // Crypto Pro Quarterly
        channel_id: channels[1]._id,
        start_date: new Date(now - 90 * 86400000),
        end_date: new Date(now + 0 * 86400000),
        status: "active",
        telegramUser_id: String(users[1].telegram_id),
        created_at: new Date(now - 90 * 86400000)
      },
      // David's Subscriptions
      {
        user_id: users[2]._id,
        plan_id: plans[6]._id, // Stock Premium Quarterly
        channel_id: channels[2]._id,
        start_date: new Date(now - 60 * 86400000),
        end_date: new Date(now + 30 * 86400000),
        status: "active",
        telegramUser_id: String(users[2].telegram_id),
        created_at: new Date(now - 60 * 86400000)
      },
      // Maria's Subscriptions
      {
        user_id: users[3]._id,
        plan_id: plans[0]._id, // Forex Basic Monthly
        channel_id: channels[0]._id,
        start_date: new Date(now - 30 * 86400000),
        end_date: new Date(now + 0 * 86400000),
        status: "active",
        telegramUser_id: String(users[3].telegram_id),
        created_at: new Date(now - 30 * 86400000)
      },
      // Raj's Subscriptions
      {
        user_id: users[4]._id,
        plan_id: plans[3]._id, // Crypto Starter Monthly
        channel_id: channels[1]._id,
        start_date: new Date(now - 15 * 86400000),
        end_date: new Date(now + 15 * 86400000),
        status: "active",
        telegramUser_id: String(users[4].telegram_id),
        created_at: new Date(now - 15 * 86400000)
      }
    ]);

    // 10. Update User Channels
    for (const user of users) {
      const userSubs = subscriptions.filter(sub => 
        sub.user_id.equals(user._id) && sub.status === "active"
      );
      user.channels = userSubs.map(sub => sub.channel_id);
      await user.save();
    }

    // 11. Seed Enhanced Links
    console.log("Seeding Enhanced Links...");
    const links = await Link.create([
      {
        url_slug: "alex-forex-elite",
        channel_id: channels[0]._id,
        subid: subscriptions.find(s => 
          s.user_id.equals(users[0]._id) && s.plan_id.equals(plans[2]._id)
        )?._id,
        name: "Alex's Forex Elite Link",
        created_by: adminUsers[0]._id,
        campaign_tag: "premium_forex",
        expires_at: new Date(now + 365 * 86400000),
        usage_cap: 100
      },
      {
        url_slug: "priya-crypto-pro",
        channel_id: channels[1]._id,
        subid: subscriptions.find(s => 
          s.user_id.equals(users[1]._id) && s.plan_id.equals(plans[4]._id)
        )?._id,
        name: "Priya's Crypto Pro Link",
        created_by: adminUsers[1]._id,
        campaign_tag: "crypto_quarterly",
        expires_at: new Date(now + 90 * 86400000),
        usage_cap: 50
      },
      {
        url_slug: "david-stock-premium",
        channel_id: channels[2]._id,
        subid: subscriptions.find(s => 
          s.user_id.equals(users[2]._id) && s.plan_id.equals(plans[6]._id)
        )?._id,
        name: "David's Stock Premium Link",
        created_by: adminUsers[2]._id,
        campaign_tag: "stock_quarterly",
        expires_at: new Date(now + 90 * 86400000),
        usage_cap: 75
      }
    ]);

    // 12. Seed Enhanced Transactions
    console.log("Seeding Enhanced Transactions...");
    const transactions = await Transaction.create([
      // Alex's Transactions
      {
        user_id: users[0]._id,
        plan_id: plans[2]._id,
        channel_id: channels[0]._id,
        amount: 8999,
        currency: "INR",
        razorpay_order_id: `order_${Date.now()}001`,
        razorpay_payment_id: `pay_${Date.now()}001`,
        status: "captured",
        subscription_id: subscriptions.find(s => 
          s.user_id.equals(users[0]._id) && s.plan_id.equals(plans[2]._id)
        )?._id,
        link_id: links[0]._id,
        createdAt: new Date(now - 180 * 86400000)
      },
      {
        user_id: users[0]._id,
        plan_id: plans[4]._id,
        channel_id: channels[1]._id,
        amount: 1999,
        currency: "INR",
        razorpay_order_id: `order_${Date.now()}002`,
        razorpay_payment_id: `pay_${Date.now()}002`,
        status: "captured",
        subscription_id: subscriptions.find(s => 
          s.user_id.equals(users[0]._id) && s.plan_id.equals(plans[4]._id)
        )?._id,
        link_id: links[1]._id,
        createdAt: new Date(now - 60 * 86400000)
      },
      // Priya's Transactions
      {
        user_id: users[1]._id,
        plan_id: plans[4]._id,
        channel_id: channels[1]._id,
        amount: 1999,
        currency: "INR",
        razorpay_order_id: `order_${Date.now()}003`,
        razorpay_payment_id: `pay_${Date.now()}003`,
        status: "captured",
        subscription_id: subscriptions.find(s => 
          s.user_id.equals(users[1]._id) && s.plan_id.equals(plans[4]._id)
        )?._id,
        link_id: links[1]._id,
        createdAt: new Date(now - 90 * 86400000)
      },
      // David's Transactions
      {
        user_id: users[2]._id,
        plan_id: plans[6]._id,
        channel_id: channels[2]._id,
        amount: 1799,
        currency: "INR",
        razorpay_order_id: `order_${Date.now()}004`,
        razorpay_payment_id: `pay_${Date.now()}004`,
        status: "captured",
        subscription_id: subscriptions.find(s => 
          s.user_id.equals(users[2]._id) && s.plan_id.equals(plans[6]._id)
        )?._id,
        link_id: links[2]._id,
        createdAt: new Date(now - 60 * 86400000)
      },
      // Maria's Transactions
      {
        user_id: users[3]._id,
        plan_id: plans[0]._id,
        channel_id: channels[0]._id,
        amount: 999,
        currency: "INR",
        razorpay_order_id: `order_${Date.now()}005`,
        razorpay_payment_id: `pay_${Date.now()}005`,
        status: "captured",
        subscription_id: subscriptions.find(s => 
          s.user_id.equals(users[3]._id) && s.plan_id.equals(plans[0]._id)
        )?._id,
        createdAt: new Date(now - 30 * 86400000)
      },
      // Raj's Transactions
      {
        user_id: users[4]._id,
        plan_id: plans[3]._id,
        channel_id: channels[1]._id,
        amount: 799,
        currency: "INR",
        razorpay_order_id: `order_${Date.now()}006`,
        razorpay_payment_id: `pay_${Date.now()}006`,
        status: "captured",
        subscription_id: subscriptions.find(s => 
          s.user_id.equals(users[4]._id) && s.plan_id.equals(plans[3]._id)
        )?._id,
        createdAt: new Date(now - 15 * 86400000)
      }
    ]);

    // 13. Seed FAQs
    console.log("Seeding FAQs...");
    await FAQ.create([
      {
        question: "How do I access my trading signals?",
        answer: "Once you subscribe to a plan, you'll receive an invitation link to join the Telegram channel where signals are posted.",
        category: "General",
        is_active: true,
        created_by: superAdminUser?._id || adminUsers[0]._id
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit/debit cards, UPI, net banking, and digital wallets through Razorpay.",
        category: "Payment",
        is_active: true,
        created_by: superAdminUser?._id || adminUsers[0]._id
      },
      {
        question: "Can I cancel my subscription?",
        answer: "Yes, you can cancel your subscription anytime. However, refunds are not provided for partial periods.",
        category: "Subscription",
        is_active: true,
        created_by: superAdminUser?._id || adminUsers[0]._id
      }
    ]);

    // 14. Seed Settings
    console.log("Seeding Settings...");
    await Setting.create([
      {
        key: "site_name",
        value: "Rigi Trading Signals",
        description: "Website name displayed throughout the application",
        category: "General"
      },
      {
        key: "contact_email",
        value: "support@rigi.com",
        description: "Primary contact email for customer support",
        category: "Contact"
      },
      {
        key: "telegram_bot_username",
        value: "@rigi_trading_bot",
        description: "Main Telegram bot username for user interactions",
        category: "Telegram"
      }
    ]);

    // 15. Seed Sample Logs
    console.log("Seeding Sample Logs...");
    await Log.create([
      {
        actor_type: "User",
        actor_id: users[0]._id,
        action_type: "SUBSCRIPTION_CREATED",
        description: "User Alex Johnson subscribed to Forex Elite plan",
        details: { plan_name: "Forex Elite - Yearly", amount: 8999 }
      },
      {
        actor_type: "Admin",
        actor_id: adminUsers[0]._id,
        action_type: "CHANNEL_CREATED",
        description: "Admin John created new channel: Forex Pro Signals",
        details: { channel_name: "Forex Pro Signals", member_count: 1250 }
      },
      {
        actor_type: "System",
        action_type: "PAYMENT_PROCESSED",
        description: "Payment processed successfully for transaction",
        details: { transaction_id: transactions[0]._id, amount: 8999 }
      }
    ]);

    console.log("--- Enhanced Data Seeding Completed Successfully ---");
    console.log(`Created: ${adminUsers.length} Admins, ${channels.length} Channels, ${plans.length} Plans`);
    console.log(`Created: ${users.length} Users, ${teamMembers.length} Team Members, ${subscriptions.length} Subscriptions`);
    console.log(`Created: ${links.length} Links, ${transactions.length} Transactions, 3 FAQs, 3 Settings, 3 Logs`);

  } catch (error) {
    console.error("Error during enhanced data seeding:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

seedEnhancedData();

