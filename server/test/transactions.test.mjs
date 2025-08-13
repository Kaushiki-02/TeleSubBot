// test/transactions.test.js - Example Structure
// No changes were needed in this file based on the last error log,
// assuming the seeding error was fixed in models/Plan.js.
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import Transaction from "../src/models/Transaction.js";
import Subscription from "../src/models/Subscription.js";
import Plan from "../src/models/Plan.js";
import Channel from "../src/models/Channel.js";
import Link from "../src/models/Link.js";
import User from "../src/models/User.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";
import sinon from "sinon";
import paymentService from "../src/services/paymentService.js";
import crypto from "crypto";

describe("Transaction Routes /api/v1/transactions", () => {
  let userToken, adminToken;
  let userId;
  let planId, channelId, linkId, linkSlug;
  let createOrderStub;

  before(async () => {
    ({
      token: userToken,
      user: { _id: userId },
    } = await loginUser("User", "txnUsr"));
    ({ token: adminToken } = await loginUser("Admin", "txnAdm"));

    const plan = await seedData(Plan, {
      name: "TxnPlan",
      discounted_price: 500,
      validity_days: 30,
    });
    planId = plan._id;
    const channel = await seedData(Channel, {
      name: "TxnChan",
      telegram_chat_id: "txn_chan",
      associated_plan_ids: [planId],
    });
    channelId = channel._id;
    const link = await seedData(Link, {
      name: "TxnLink",
      url_slug: "txn-link",
      channel_id: channelId,
      created_by: userId, // User created link for simplicity here
    });
    linkId = link._id;
    linkSlug = link.url_slug;
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
    await Subscription.deleteMany({}); // Clear subs too
    // Stub Razorpay order creation
    createOrderStub = sinon
      .stub(paymentService, "createRazorpayOrder")
      .resolves({
        id: `order_test_${Date.now()}`,
        amount: 50000, // amount in paise
        currency: "INR",
        receipt: "test_receipt",
        status: "created",
      });
  });

  afterEach(() => {
    createOrderStub.restore();
  });

  describe("POST /order", () => {
    const orderData = { plan_id: null, channel_id: null }; // Will set IDs in test

    beforeEach(() => {
      // Set IDs before each test in this block
      orderData.plan_id = planId.toString();
      orderData.channel_id = channelId.toString();
    });

    it("should create a transaction and return Razorpay order details", async () => {
      const res = await request(app)
        .post("/api/v1/transactions/order")
        .set("Authorization", `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(res.body.status).to.equal("success");
      expect(res.body.data.orderId).to.match(/^order_test_/);
      expect(res.body.data.amount).to.equal(50000);
      expect(res.body.data.razorpayKeyId).to.equal(process.env.RAZORPAY_KEY_ID);
      expect(createOrderStub.calledOnce).to.be.true;

      // Verify transaction created in DB
      const txn = await Transaction.findOne({
        razorpay_order_id: res.body.data.orderId,
      });
      expect(txn).to.exist;
      expect(txn.status).to.equal("created");
      expect(txn.user_id.toString()).to.equal(userId.toString());
      expect(txn.plan_id.toString()).to.equal(planId.toString());
      expect(txn.channel_id.toString()).to.equal(channelId.toString());
      expect(txn.amount).to.equal(500); // Stored amount should be actual price
    });

    it("should create order with link ID if link_slug is provided", async () => {
      const res = await request(app)
        .post("/api/v1/transactions/order")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ ...orderData, link_slug: linkSlug })
        .expect(201);

      const txn = await Transaction.findOne({
        razorpay_order_id: res.body.data.orderId,
      });
      expect(txn).to.exist;
      expect(txn.link_id.toString()).to.equal(linkId.toString());
    });

    // Add tests for invalid plan/channel IDs (404), plan not active, plan not associated with channel (400), expired/capped link (410)
    it("should fail with 401 if not logged in", async () => {
      await request(app)
        .post("/api/v1/transactions/order")
        .send(orderData)
        .expect(401);
    });
  });

  describe("POST /verify", () => {
    let testOrderId;
    let testTxn;

    beforeEach(async () => {
      // Create an order and transaction first
      const orderRes = await request(app)
        .post("/api/v1/transactions/order")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ plan_id: planId, channel_id: channelId });
      testOrderId = orderRes.body.data.orderId;
      testTxn = await Transaction.findOne({ razorpay_order_id: testOrderId });
    });

    it("should verify payment, create subscription, update transaction, and check KYC", async () => {
      const paymentId = `pay_test_${Date.now()}`;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(testOrderId + "|" + paymentId)
        .digest("hex");

      const res = await request(app)
        .post("/api/v1/transactions/verify")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          razorpay_payment_id: paymentId,
          razorpay_order_id: testOrderId,
          razorpay_signature: signature,
        })
        .expect(200);

      expect(res.body.status).to.equal("success");
      expect(res.body.message).to.include("Subscription activated");
      expect(res.body.data.subscriptionId).to.exist;
      expect(res.body.data.needsKyc).to.be.a("boolean"); // Should be true for new user

      // Verify DB: Transaction updated
      const updatedTxn = await Transaction.findById(testTxn._id);
      expect(updatedTxn.status).to.equal("captured");
      expect(updatedTxn.razorpay_payment_id).to.equal(paymentId);
      expect(updatedTxn.subscription_id.toString()).to.equal(
        res.body.data.subscriptionId
      );

      // Verify DB: Subscription created
      const sub = await Subscription.findById(res.body.data.subscriptionId);
      expect(sub).to.exist;
      expect(sub.status).to.equal("active");
      expect(sub.user_id.toString()).to.equal(userId.toString());
    });

    it("should return success if payment already verified", async () => {
      // Manually mark as captured first
      await Transaction.updateOne(
        { _id: testTxn._id },
        { $set: { status: "captured" } }
      );
      const paymentId = `pay_test_already_${Date.now()}`;
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(testOrderId + "|" + paymentId)
        .digest("hex");
      const res = await request(app)
        .post("/api/v1/transactions/verify")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          razorpay_payment_id: paymentId,
          razorpay_order_id: testOrderId,
          razorpay_signature: signature,
        })
        .expect(200);
      expect(res.body.message).to.equal("Payment already verified.");
    });

    it("should fail with 400 for invalid signature", async () => {
       const paymentId = `pay_test_invalid_${Date.now()}`;
       const invalidSignature = 'f'.repeat(64); // Ensure correct length
      const res = await request(app)
        .post("/api/v1/transactions/verify")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          razorpay_payment_id: paymentId,
          razorpay_order_id: testOrderId,
          razorpay_signature: invalidSignature, 
        })
        .expect(400);
      expect(res.body.message).to.include("Invalid signature");
    });
    it("should fail with 404 if transaction not found", async () => {
      const paymentId = `pay_test_notfound_${Date.now()}`;
      const nonExistentOrderId = "order_xxxxxxxxxxxx";
      const signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(nonExistentOrderId + "|" + paymentId)
        .digest("hex");
      await request(app)
        .post("/api/v1/transactions/verify")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          razorpay_payment_id: paymentId,
          razorpay_order_id: nonExistentOrderId,
          razorpay_signature: signature,
        })
        .expect(404);
    });
    // Add test for status !== 'created'
  });

  // Add tests for GET /my-history, GET / (admin), GET /:id (admin), GET /:id/invoice, GET /reconcile
});
