// test/analytics.test.js
import { expect } from "chai";
import request from "supertest";
import app from "../server.js";
import Transaction from "../src/models/Transaction.js";
import Subscription from "../src/models/Subscription.js";
import Link from "../src/models/Link.js";
import User from "../src/models/User.js";
import Plan from "../src/models/Plan.js";
import Channel from "../src/models/Channel.js";
import { loginUser, seedData, getObjectIdString } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Analytics Routes /api/v1/analytics", () => {
  let adminToken, salesToken, userToken;
  let salesUser; // Need salesUser object for filtering links
  let planId, channelId, linkId;
  let salesUserId; // Define salesUserId here

  before(async () => {
    // Login users (these calls trigger the phone/telegram_id fix)
    ({ token: adminToken } = await loginUser("Admin", "anaAdm"));
    ({
      token: salesToken,
      user: salesUser, // Assign the whole user object
    } = await loginUser("Sales", "anaSal"));
    ({ token: userToken } = await loginUser("User", "anaUsr"));
    salesUserId = salesUser._id; // Extract ID after getting user object

    // Seed data for analytics (ensure this seeding is compatible with loginUser's cleanup)
    // Alternatively, seed these in beforeEach if needed fresh per describe/it block
    // For 'before all' hook, this data persists across all tests in this file.
    await Plan.deleteMany({}); // Clean before seeding
    await Channel.deleteMany({});
    await Link.deleteMany({});
    await Transaction.deleteMany({});
    await Subscription.deleteMany({}); // Add Subscription clean if metrics tested

    const plan = await seedData(Plan, {
      name: "AnaPlan",
      discounted_price: 100,
      validity_days: 30,
    });
    planId = plan._id;
    const channel = await seedData(Channel, {
      name: "AnaChan",
      telegram_chat_id: "anachan_test",
    });
    channelId = channel._id;
    const link = await seedData(Link, {
      name: "AnaLink",
      url_slug: "ana-link-test",
      channel_id: channelId,
      created_by: salesUserId, // Use the extracted ID
      click_count: 10,
      otp_verification_count: 5,
      subscription_count: 2,
    });
    linkId = link._id;

    await seedData(Transaction, [
      {
        user_id: new mongoose.Types.ObjectId(),
        plan_id: planId,
        channel_id: channelId,
        amount: 100,
        status: "captured",
        link_id: linkId,
        createdAt: new Date("2024-03-10"),
        razorpay_order_id: `test_order_${Date.now()}${Math.random()}`,
      },
      {
        user_id: new mongoose.Types.ObjectId(),
        plan_id: planId,
        channel_id: channelId,
        amount: 100,
        status: "captured",
        createdAt: new Date("2024-03-15"),
        razorpay_order_id: `test_order_${Date.now()}${Math.random()}`,
      },
      {
        user_id: new mongoose.Types.ObjectId(),
        plan_id: planId,
        channel_id: channelId,
        amount: 100,
        status: "failed",
        createdAt: new Date("2024-03-16"),
        razorpay_order_id: `test_order_${Date.now()}${Math.random()}`,
      },
    ]);
  });

  describe("GET /revenue", () => {
    // Requires Analytics:read:revenue
    it("should get total revenue for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/v1/analytics/revenue?startDate=2024-03-01&endDate=2024-03-31"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      // MODIFIED: Directly assert the expected format since we know groupBy is not used here.
      expect(res.body.data).to.be.an("array").with.lengthOf(1);
      expect(res.body.data[0].totalRevenue).to.equal(200);
    });
    it("should get revenue grouped by channel for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/v1/analytics/revenue?startDate=2024-03-01&endDate=2024-03-31&groupBy=channel"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).to.be.an("array").with.lengthOf(1);
      // Check the structure returned by the aggregation with lookup
      expect(res.body.data[0].id).to.equal(channelId.toString());
      expect(res.body.data[0].name).to.equal("AnaChan");
      expect(res.body.data[0].totalRevenue).to.equal(200);
    });
    // Add tests for groupBy plan, salesRep
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/analytics/revenue")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    it("should fail with 403 for Sales (lacking Analytics:read:revenue)", async () => {
      await request(app)
        .get(
          "/api/v1/analytics/revenue?startDate=2024-03-01&endDate=2024-03-31"
        )
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
    });
  });

  describe("GET /subscription-metrics", () => {
    // Requires Analytics:read:subscription
    beforeEach(async () => {
      // Seed subs for these tests
      await Subscription.deleteMany({});
      await seedData(Subscription, [
        {
          user_id: new mongoose.Types.ObjectId(),
          plan_id: planId,
          channel_id: channelId,
          status: "active",
          start_date: new Date("2024-03-05"),
          end_date: new Date("2024-04-04"),
          createdAt: new Date("2024-03-05"),
          updatedAt: new Date("2024-03-05"), // Match createdAt for simplicity
          from_subscription_id: null,
        }, // New
        {
          user_id: new mongoose.Types.ObjectId(),
          plan_id: planId,
          channel_id: channelId,
          status: "active",
          start_date: new Date("2024-03-10"),
          end_date: new Date("2024-04-09"),
          createdAt: new Date("2024-03-10"),
          updatedAt: new Date("2024-03-10"),
          from_subscription_id: new mongoose.Types.ObjectId(),
        }, // Renewal
        {
          user_id: new mongoose.Types.ObjectId(),
          plan_id: planId,
          channel_id: channelId,
          status: "expired",
          start_date: new Date("2024-02-15"),
          end_date: new Date("2024-03-17"), // Expired within period
          createdAt: new Date("2024-02-15"),
          updatedAt: new Date("2024-03-17"), // Set updatedAt to expiry date
        },
      ]);
    });
    it("should get count of new subscriptions for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/v1/analytics/subscription-metrics?startDate=2024-03-01&endDate=2024-03-31&type=new"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.count).to.equal(1);
    });
    it("should get count of renewals for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/v1/analytics/subscription-metrics?startDate=2024-03-01&endDate=2024-03-31&type=renewal"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.count).to.equal(1);
    });
    it("should get count of expirations for Admin", async () => {
      const res = await request(app)
        .get(
          "/api/v1/analytics/subscription-metrics?startDate=2024-03-01&endDate=2024-03-31&type=expiry"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.count).to.equal(1);
    });
    // Add auth tests
  });

  describe("GET /churn-rate", () => {
    // Requires Analytics:read:churn
    it("should return churn rate calculation (placeholder/illustrative)", async () => {
      // Churn calculation is complex and needs more seeding/logic
      const res = await request(app)
        .get("/api/v1/analytics/churn-rate?period=monthly")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).to.have.property("rate");
      // expect(res.body.data.calculation).to.not.equal('Placeholder'); // Check when implemented
    });
    // Add auth tests
  });

  describe("GET /ltv", () => {
    // Requires Analytics:read:ltv
    it("should calculate LTV for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/analytics/ltv?startDate=2024-03-01&endDate=2024-03-31")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).to.have.property("averageLtv");
      expect(res.body.data.totalRevenue).to.equal(200);
      expect(res.body.data.customerCount).to.be.greaterThan(0); // Based on seeded txns
    });
    // Add auth tests
  });

  describe("GET /link-conversion", () => {
    // Requires Analytics:read:link:all or :own
    it("should get link conversion for Admin (all links)", async () => {
      const res = await request(app)
        .get("/api/v1/analytics/link-conversion")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).to.be.an("array").with.length.greaterThan(0);
      const anaLink = res.body.data.find((l) => l.linkId === linkId.toString());
      expect(anaLink.clicks).to.equal(10);
      expect(anaLink.subscriptions).to.equal(2);
      expect(anaLink.overallConversionRate).to.equal("20.00");
    });
    it("should get link conversion for Sales (own links only)", async () => {
      const res = await request(app)
        .get("/api/v1/analytics/link-conversion")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(200);
      expect(res.body.data).to.be.an("array").with.lengthOf(1); // Only link created by salesUserId
      expect(res.body.data[0].linkId).to.equal(linkId.toString());
      expect(res.body.data[0].salesRep).to.equal(salesUser.phone); // Check if phone matches user object
    });
    it("should allow Admin to filter by salesRepId", async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/link-conversion?salesRepId=${salesUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data).to.be.an("array").with.lengthOf(1);
      expect(res.body.data[0].linkId).to.equal(linkId.toString());
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/analytics/link-conversion")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("GET /export", () => {
    // Requires Analytics:export
    it("should export revenue data as CSV for Admin", async () => {
      await request(app)
        .get("/api/v1/analytics/export?reportType=revenue&format=csv")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect("Content-Type", /csv/);
    });
    it("should export link conversion data as CSV for Admin", async () => {
      // Note: Sales might only have 'Analytics:read:link:own', not 'Analytics:export'
      // Check permissions in seed.js. If Sales lacks export perm, this test should use adminToken.
      await request(app)
        .get("/api/v1/analytics/export?reportType=link-conversion&format=csv")
        .set("Authorization", `Bearer ${adminToken}`) // Use adminToken if Sales lacks export permission
        .expect(200)
        .expect("Content-Type", /csv/);
    });
    it("should return 501 for unsupported subscription-metrics export", async () => {
      await request(app)
        .get(
          "/api/v1/analytics/export?reportType=subscription-metrics&format=csv"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(501);
    });
    it("should return 200 OK for PDF export (placeholder)", async () => {
      // Updated expectation based on previous fix attempt
      await request(app)
        .get("/api/v1/analytics/export?reportType=revenue&format=pdf")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect("Content-Type", /pdf/);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/analytics/export?reportType=revenue")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    // Add tests for specific report type permissions if finer grain needed
  });
});
