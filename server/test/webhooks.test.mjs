// test/webhook.test.js
import { expect } from "chai";
import request from "supertest";
import sinon from "sinon";
import User from "../src/models/User.js";
import Plan from "../src/models/Plan.js";
import Channel from "../src/models/Channel.js";
import app from "../server.js";
import Subscription from "../src/models/Subscription.js";
import Transaction from "../src/models/Transaction.js";
import Reminder from "../src/models/Reminder.js";
import { seedData } from "./helpers.mjs";
import mongoose from "mongoose";
import webhookHelper from "../src/utils/webhookHelper.js"; // Import the helper
// Import activateSubscription helper from transactionController if needed directly
// import { activateSubscription } from '../src/controllers/transactionController.js';

let verifyStub; // Stub for webhook verification

describe("Webhook Routes /api/v1/webhooks", () => {
  beforeEach(() => {
    // Stub the verification helper for these tests
    verifyStub = sinon
      .stub(webhookHelper, "verifyRazorpaySignature")
      .returns(true); // Assume valid by default
  });

  afterEach(() => {
    if (verifyStub) verifyStub.restore();
    // Add cleanup for other stubs if added in individual tests
  });

  describe("POST /razorpay", () => {
    let testOrderId, testTxnId, planId, channelId, userId;
    let seededPlan, seededChannel, seededUser; // Added

    beforeEach(async () => {
      await Transaction.deleteMany({});
      await Subscription.deleteMany({});
      await Plan.deleteMany({}); // Clear related data
      await Channel.deleteMany({});
      await User.deleteMany({});

      // --- SEED REQUIRED DATA FOR ACTIVATION ---
      // Seed a User, Plan, and Channel that the transaction will reference
       const userRole = await mongoose.model('Role').findOne({ name: 'User' }); // Get User role ID
      seededUser = await seedData(User, {
        phone: "+919999900001",
        role_id: userRole._id, 
      }); 
      seededPlan = await seedData(Plan, {
        name: "WebhookPlan",
        discounted_price: 100,
        validity_days: 30,
      });
      seededChannel = await seedData(Channel, {
        name: "WebhookChan",
        telegram_chat_id: "webhook_chan_test",
      });
      userId = seededUser._id;
      planId = seededPlan._id;
      channelId = seededChannel._id;
      // --- END SEED REQUIRED DATA ---

      // Seed a transaction in 'created' state referencing the seeded data
      testOrderId = `order_hook_${Date.now()}`;
      const txn = await seedData(Transaction, {
        user_id: userId,
        plan_id: planId,
        channel_id: channelId,
        amount: 100,
        currency: "INR",
        razorpay_order_id: testOrderId,
        status: "created",
      });
      testTxnId = txn._id;

      // TODO: Mock paymentService.fetchRazorpayInvoice if used in controller
      // TODO: Mock telegramService.removeUserFromChannel if called by activateSubscription (it's not currently, but if added)
    });

    it("should process payment.captured webhook and update transaction/subscription", async () => {
      const paymentId = `pay_hook_${Date.now()}`;
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: testOrderId,
              status: "captured",
              amount: 10000, // in paise
              currency: "INR",
              // ... other payment fields ...
            },
          },
        },
      };
      // Use the payload object directly; supertest handles stringifying for the body
      const signature = "mock_signature"; // Signature irrelevant if verification stubbed

      const res = await request(app)
        .post("/api/v1/webhooks/razorpay")
        .set("X-Razorpay-Signature", signature)
        .set("Content-Type", "application/json")
        .send(payload) // Send the JS object
        .expect(200); // Expect 200 OK from the webhook handler

      expect(res.body.status).to.equal("ok");

      // Verify DB changes (assuming verification passed or was bypassed/mocked)
      const updatedTxn = await Transaction.findById(testTxnId);
      expect(updatedTxn.status).to.equal("captured");
      expect(updatedTxn.razorpay_payment_id).to.equal(paymentId);
      expect(updatedTxn.subscription_id).to.exist; // Subscription should be linked

      const sub = await Subscription.findById(updatedTxn.subscription_id);
      expect(sub).to.exist;
      expect(sub.status).to.equal("active"); // Subscription should be active
      expect(sub.user_id.toString()).to.equal(userId.toString()); // Check user link
      expect(sub.plan_id.toString()).to.equal(planId.toString()); // Check plan link
      expect(sub.channel_id.toString()).to.equal(channelId.toString()); // Check channel link
    });

    it("should process payment.failed webhook and update transaction", async () => {
      const paymentId = `pay_failed_hook_${Date.now()}`;
      const payload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: testOrderId,
              status: "failed",
              error_description: "Test failure",
            },
          },
        },
      };
      const signature = "mock_signature";

      const res = await request(app)
        .post("/api/v1/webhooks/razorpay")
        .set("X-Razorpay-Signature", signature)
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(200);

      expect(res.body.status).to.equal("ok");
      const updatedTxn = await Transaction.findById(testTxnId);
      expect(updatedTxn.status).to.equal("failed");
      expect(updatedTxn.razorpay_payment_id).to.equal(paymentId); // Payment ID might be available even on failed
    });

    it("should fail with 403 for invalid signature (if stub returns false)", async () => {
      verifyStub.returns(false); // Override stub to simulate failure
      const payload = { event: "payment.captured", payload: {} };
      await request(app)
        .post("/api/v1/webhooks/razorpay")
        .set("X-Razorpay-Signature", "invalid-signature")
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(403); // Expecting Forbidden due to signature mismatch
    });

    it("should handle idempotency for payment.captured", async () => {
      // Manually mark as captured and create a subscription first, simulating a previous successful webhook
      const existingSub = await seedData(Subscription, {
        user_id: userId,
        plan_id: planId,
        channel_id: channelId,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "active",
      });
      await Transaction.updateOne(
        { _id: testTxnId },
        {
          $set: {
            status: "captured",
            subscription_id: existingSub._id,
            razorpay_payment_id: "already_captured_pay_id",
          },
        }
      );

      const paymentId = `pay_hook_idem_${Date.now()}`;
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: testOrderId,
              status: "captured",
            },
          },
        },
      };
      const signature = "mock_signature";

      const res = await request(app)
        .post("/api/v1/webhooks/razorpay")
        .set("X-Razorpay-Signature", signature)
        .set("Content-Type", "application/json")
        .send(payload)
        .expect(200);

      expect(res.body.status).to.equal("ok"); // Webhook should still return OK

      // Verify DB state: Transaction should still be captured, subscription should still be the original one
      const finalTxn = await Transaction.findById(testTxnId);
      expect(finalTxn.status).to.equal("captured");
      expect(finalTxn.razorpay_payment_id).to.equal("already_captured_pay_id"); // Payment ID should NOT be overwritten
      expect(finalTxn.subscription_id.toString()).to.equal(
        existingSub._id.toString()
      ); // Sub ID should NOT change

      // Verify no *new* subscription was created
      const subscriptionCount = await Subscription.countDocuments({
         user_id: userId, // Check for the same user
         _id: { $ne: existingSub._id }, // Exclude the existing one
      });
      expect(subscriptionCount).to.equal(0);
    });

    // Add tests for unhandled events (should return 200 ok)
    // Add test for webhook payload missing required fields (should return 400)
    // Add test where Plan/Channel/User might be deleted before webhook arrives (should handle gracefully, maybe log error)
  });

  describe("POST /whatsapp/status", () => {
    let reminderId, messageSid;

    beforeEach(async () => {
      await Reminder.deleteMany({});
      messageSid = `SMhook_${Date.now()}`;
      const reminder = await seedData(Reminder, {
        subscription_id: new mongoose.Types.ObjectId(),
        user_id: new mongoose.Types.ObjectId(),
        channel_id: new mongoose.Types.ObjectId(),
        scheduled_date: new Date(),
        template_name: "Test Template",
        status: "sent",
        message_sid: messageSid,
      });
      reminderId = reminder._id;
    });

    it("should update reminder status on receiving webhook", async () => {
      const payload = {
        MessageSid: messageSid,
        MessageStatus: "delivered",
      };

      const res = await request(app)
        .post("/api/v1/webhooks/whatsapp/status")
        // TODO: Add signature verification headers/logic if implemented
        .send(payload)
        .expect(200); // Expect 200 OK from the webhook handler

      expect(res.body.status).to.equal("ok");

      const updatedReminder = await Reminder.findById(reminderId);
      expect(updatedReminder.status).to.equal("delivered");
      expect(updatedReminder.last_status_update_at).to.exist;
    });

    it("should return 200 ok even if reminder SID not found", async () => {
      const payload = {
        MessageSid: "SMnonexistent",
        MessageStatus: "delivered",
      };
      await request(app)
        .post("/api/v1/webhooks/whatsapp/status")
        .send(payload)
        .expect(200);
    });
    it("should return 400 if required fields are missing", async () => {
      // Send payload missing MessageStatus
      await request(app)
        .post("/api/v1/webhooks/whatsapp/status")
        .send({ MessageSid: messageSid })
        .expect(400);
      // Send payload missing MessageSid
      await request(app)
        .post("/api/v1/webhooks/whatsapp/status")
        .send({ MessageStatus: "read" })
        .expect(400);
      // Send empty payload
      await request(app)
        .post("/api/v1/webhooks/whatsapp/status")
        .send({})
        .expect(400);
    });
    // Add test for webhook signature verification if implemented
  });
});
