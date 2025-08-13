// test/subscriptions.test.mjs
import request from "supertest";
import { expect } from "chai";
import app from "../server.js";
import Subscription from "../src/models/Subscription.js";
import User from "../src/models/User.js";
import Plan from "../src/models/Plan.js";
import Channel from "../src/models/Channel.js";
import Transaction from "../src/models/Transaction.js";
import { loginUser, seedData, getObjectIdString } from "./helpers.mjs";
import mongoose from "mongoose";
import sinon from "sinon";
import paymentService from "../src/services/paymentService.js";
// MODIFIED: Import the *namespace* for ESM stubbing
import * as telegramService from "../src/services/telegramService.js";

describe("Subscription Routes /api/v1/subscriptions", () => {
  let userToken, supportToken, adminToken, salesToken;
  let userId, supportUserId, adminUserId, salesUserId;
  let plan1Id, plan2Id, channelId;
  let sub1, sub2_expired, sub3_other_user;
  let removeUserStub, createOrderStub;

  before(async () => {
    ({
      token: userToken,
      user: { _id: userId },
    } = await loginUser("User", "subUsr"));
    ({
      token: supportToken,
      user: { _id: supportUserId },
    } = await loginUser("Support", "subSup"));
    ({
      token: adminToken,
      user: { _id: adminUserId },
    } = await loginUser("Admin", "subAdm"));
    ({
      token: salesToken,
      user: { _id: salesUserId },
    } = await loginUser("Sales", "subSal"));

    const plans = await seedData(Plan, [
      { name: "SubPlan1", discounted_price: 100, validity_days: 30 },
      { name: "SubPlan2 Premium", discounted_price: 500, validity_days: 30 },
    ]);
    plan1Id = plans[0]._id;
    plan2Id = plans[1]._id;
    const channel = await seedData(Channel, {
      name: "SubChan",
      telegram_chat_id: "sub_chan",
    });
    channelId = channel._id;
  });

  beforeEach(async () => {
    await Subscription.deleteMany({});
    await Transaction.deleteMany({});

    const now = Date.now();
    const subs = await seedData(Subscription, [
      {
        user_id: userId,
        plan_id: plan1Id,
        channel_id: channelId,
        start_date: new Date(now - 5 * 24 * 60 * 60 * 1000),
        end_date: new Date(now + 25 * 24 * 60 * 60 * 1000),
        status: "active",
      },
      {
        user_id: userId,
        plan_id: plan1Id,
        channel_id: channelId,
        start_date: new Date(now - 40 * 24 * 60 * 60 * 1000),
        end_date: new Date(now - 10 * 24 * 60 * 60 * 1000),
        status: "expired",
      },
      {
        user_id: supportUserId,
        plan_id: plan1Id,
        channel_id: channelId,
        start_date: new Date(now - 2 * 24 * 60 * 60 * 1000),
        end_date: new Date(now + 28 * 24 * 60 * 60 * 1000),
        status: "active",
      },
    ]);
    sub1 = subs[0];
    sub2_expired = subs[1];
    sub3_other_user = subs[2];

    // MODIFIED: Stub the function on the imported namespace
    removeUserStub = sinon
      .stub(telegramService, "removeUserFromChannel")
      .resolves({ success: true });
    createOrderStub = sinon
      .stub(paymentService, "createRazorpayOrder")
      .resolves({
        id: `order_upgrade_${Date.now()}`,
        amount: 50000,
        currency: "INR",
      });
  });

  afterEach(() => {
    // Restore stubs
    if (removeUserStub) removeUserStub.restore();
    if (createOrderStub) createOrderStub.restore();
  });

  describe("GET /my-groups", () => {
    // Requires Subscription:read:own
    it("should get only own subscriptions for logged-in user", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions/my-groups")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.subscriptions).to.be.an("array").with.lengthOf(2);
      expect(
        res.body.data.subscriptions.every(
          (s) => s.user_id === userId.toString()
        )
      ).to.be.true;
    });
    it("should filter own subscriptions by status", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions/my-groups?status=active")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.subscriptions).to.be.an("array").with.lengthOf(1);
      expect(res.body.data.subscriptions[0]._id).to.equal(sub1._id.toString());
    });
    it("should fail with 401 if not logged in", async () => {
      await request(app).get("/api/v1/subscriptions/my-groups").expect(401);
    });
  });

  describe("POST /renew/:id", () => {
    // Requires Subscription:renew
    it("should initiate renewal by returning plan/channel IDs", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/renew/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.message).to.include("Proceed to create payment order");
      expect(res.body.data.planId).to.equal(plan1Id.toString());
      expect(res.body.data.channelId).to.equal(channelId.toString());
    });
    it("should fail with 404 if trying to renew another user's subscription", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/renew/${sub3_other_user._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);
    });
    it("should fail with 404 for non-existent subscription", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/renew/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);
    });
    it("should fail with 401 if not logged in", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/renew/${sub1._id}`)
        .expect(401);
    });
  });

  describe("POST /upgrade/:id", () => {
    // Requires Subscription:upgrade
    it("should initiate upgrade by creating transaction and returning order details", async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/upgrade/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ new_plan_id: plan2Id.toString() })
        .expect(201);

      expect(res.body.status).to.equal("success");
      expect(res.body.data.orderId).to.match(/^order_upgrade_/);
      expect(res.body.data.amount).to.equal(50000);

      const txn = await Transaction.findOne({
        razorpay_order_id: res.body.data.orderId,
      });
      expect(txn).to.exist;
      expect(txn.status).to.equal("created");
      expect(txn.from_subscription_id.toString()).to.equal(
        sub1._id.toString()
      );
      expect(txn.plan_id.toString()).to.equal(plan2Id.toString());
    });
    it("should fail with 400 if subscription is not active", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/upgrade/${sub2_expired._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ new_plan_id: plan2Id })
        .expect(400);
    });
    it("should fail with 400 if new plan ID is missing or invalid", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/upgrade/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({})
        .expect(400);
      await request(app)
        .post(`/api/v1/subscriptions/upgrade/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ new_plan_id: "invalid" })
        .expect(400);
    });
    it("should fail with 404 if new plan not found", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/upgrade/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ new_plan_id: new mongoose.Types.ObjectId() })
        .expect(404);
    });
    it("should fail with 400 if upgrading to the same plan", async () => {
      await request(app)
        .post(`/api/v1/subscriptions/upgrade/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ new_plan_id: plan1Id })
        .expect(400);
    });
  });

  describe("GET / (Management)", () => {
    // Requires Subscription:read:all
    it("should get all subscriptions for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.subscriptions).to.be.an("array").with.lengthOf(3);
    });
    it("should get all subscriptions for Support", async () => {
      await request(app)
        .get("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${supportToken}`)
        .expect(200);
    });
    it("should fail with 403 for Sales/User", async () => {
      await request(app)
        .get("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
      await request(app)
        .get("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("GET /:id (Management)", () => {
    // Requires Subscription:read
    it("should get a specific subscription for Admin", async () => {
      const res = await request(app)
        .get(`/api/v1/subscriptions/${sub1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.subscription._id).to.equal(sub1._id.toString());
    });
    it("should get a specific subscription for Support", async () => {
      await request(app)
        .get(`/api/v1/subscriptions/${sub1._id}`)
        .set("Authorization", `Bearer ${supportToken}`)
        .expect(200);
    });
    it("should fail with 403 for Sales/User", async () => {
      await request(app)
        .get(`/api/v1/subscriptions/${sub1._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
      await request(app)
        .get(`/api/v1/subscriptions/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .get(`/api/v1/subscriptions/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("PUT /extend/:id", () => {
    // Requires Subscription:extend (Support)
    const extensionData = { extension_days: 10 };
    it("should extend an active subscription for Support", async () => {
      const originalEndDate = sub1.end_date;
      const res = await request(app)
        .put(`/api/v1/subscriptions/extend/${sub1._id}`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send(extensionData)
        .expect(200);
      expect(res.body.data.subscription.end_date).to.not.equal(
        originalEndDate.toISOString()
      );
      const expectedEndDate = new Date(
        originalEndDate.getTime() + 10 * 24 * 60 * 60 * 1000
      );
      expect(new Date(res.body.data.subscription.end_date).getTime()).to.equal(
        expectedEndDate.getTime()
      );
      expect(res.body.data.subscription.status).to.equal("active");
    });
    it("should extend an expired subscription and set status to active for Support", async () => {
      const originalEndDate = sub2_expired.end_date;
      const res = await request(app)
        .put(`/api/v1/subscriptions/extend/${sub2_expired._id}`)
        .set("Authorization", `Bearer ${supportToken}`)
        .send(extensionData)
        .expect(200);
      const expectedEndDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      expect(
        new Date(res.body.data.subscription.end_date).getTime()
      ).to.be.closeTo(expectedEndDate.getTime(), 2000);
      expect(res.body.data.subscription.status).to.equal("active");
    });
    it("should fail with 403 for Admin/Sales/User", async () => {
      await request(app)
        .put(`/api/v1/subscriptions/extend/${sub1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(extensionData)
        .expect(403);
      await request(app)
        .put(`/api/v1/subscriptions/extend/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(extensionData)
        .expect(403);
    });
  });

  describe("PUT /extend/bulk", () => {
    // Requires Subscription:extend (Support)
    const bulkData = { subscription_ids: [], extension_days: 5 };
    beforeEach(() => {
      bulkData.subscription_ids = [
        sub1._id.toString(),
        sub2_expired._id.toString(),
      ];
    });
    it("should bulk extend subscriptions for Support", async () => {
      const res = await request(app)
        .put("/api/v1/subscriptions/extend/bulk")
        .set("Authorization", `Bearer ${supportToken}`)
        .send(bulkData)
        .expect(200);
      expect(res.body.data.succeeded).to.have.lengthOf(2);
      expect(res.body.data.failed).to.have.lengthOf(0);
    });
    it("should report failures for invalid IDs in bulk extend", async () => {
      bulkData.subscription_ids.push(
        "invalid-id",
        new mongoose.Types.ObjectId().toString()
      );
      const res = await request(app)
        .put("/api/v1/subscriptions/extend/bulk")
        .set("Authorization", `Bearer ${supportToken}`)
        .send(bulkData)
        .expect(200);
      expect(res.body.data.succeeded).to.have.lengthOf(2);
      expect(res.body.data.failed).to.have.lengthOf(2);
      expect(res.body.data.failed[0].error).to.include("Invalid ID format");
      expect(res.body.data.failed[1].error).to.include("Not found");
    });
  });

  describe("PUT /revoke/:id", () => {
    // Requires Subscription:revoke (Admin)
    it("should revoke an active subscription for Admin", async () => {
      expect(sub1.status).to.equal("active");
      const res = await request(app)
        .put(`/api/v1/subscriptions/revoke/${sub1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.subscription.status).to.equal("revoked");
      // expect(removeUserStub.calledOnce).to.be.true; // This requires user/channel to have TG IDs seeded
      const revokedSub = await Subscription.findById(sub1._id);
      expect(revokedSub.status).to.equal("revoked");
    });
    it("should fail with 403 for Support/Sales/User", async () => {
      await request(app)
        .put(`/api/v1/subscriptions/revoke/${sub1._id}`)
        .set("Authorization", `Bearer ${supportToken}`)
        .expect(403);
      await request(app)
        .put(`/api/v1/subscriptions/revoke/${sub1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    it("should return 200 if already revoked", async () => {
      await Subscription.findByIdAndUpdate(sub1._id, { status: "revoked" });
      await request(app)
        .put(`/api/v1/subscriptions/revoke/${sub1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .put(`/api/v1/subscriptions/revoke/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
