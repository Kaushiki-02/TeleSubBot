// test/reminders.test.js
// No changes were needed in this file based on the last error log.
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import ReminderTemplate from "../src/models/ReminderTemplate.js";
import Reminder from "../src/models/Reminder.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Reminder & Template Routes /api/v1/reminders", () => {
  let adminToken, userToken;
  let template1, template2;

  before(async () => {
    ({ token: adminToken } = await loginUser("Admin", "remAdm")); // Assumes Admin has ReminderTemplate:* perms
    ({ token: userToken } = await loginUser("User", "remUsr"));
  });

  beforeEach(async () => {
    await ReminderTemplate.deleteMany({});
    await Reminder.deleteMany({}); // Clear delivery reports too
    template1 = await seedData(ReminderTemplate, {
      name: "Tpl 1",
      content: "Hi",
      type: "custom",
      is_active: true,
    });
    template2 = await seedData(ReminderTemplate, {
      name: "Tpl 2 Exp",
      content: "Expiring",
      type: "pre-expiry",
      days_before_expiry: 2,
      is_active: true,
    });
  });

  // --- Template Management ---
  describe("GET /templates", () => {
    // Requires ReminderTemplate:read
    it("should get all templates for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/reminders/templates")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.templates).to.be.an("array").with.lengthOf(2);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/reminders/templates")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("POST /templates", () => {
    // Requires ReminderTemplate:create
    const validTemplate = { name: "New Tpl", content: "Body", type: "custom" };
    it("should create a template for Admin", async () => {
      const res = await request(app)
        .post("/api/v1/reminders/templates")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validTemplate)
        .expect(201);
      expect(res.body.data.template.name).to.equal(validTemplate.name);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .post("/api/v1/reminders/templates")
        .set("Authorization", `Bearer ${userToken}`)
        .send(validTemplate)
        .expect(403);
    });
    it("should fail with 400 if name is missing", async () => {
      await request(app)
        .post("/api/v1/reminders/templates")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "No name", type: "custom" })
        .expect(400);
    });
    // Add more validation tests (duplicate name, invalid type, missing days for pre-expiry)
  });

  describe("GET /templates/:id", () => {
    // Requires ReminderTemplate:read
    it("should get a template by ID for Admin", async () => {
      const res = await request(app)
        .get(`/api/v1/reminders/templates/${template1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.template.name).to.equal(template1.name);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get(`/api/v1/reminders/templates/${template1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .get(`/api/v1/reminders/templates/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("PUT /templates/:id", () => {
    // Requires ReminderTemplate:update
    const updateData = { content: "Updated Content", is_active: false };
    it("should update a template for Admin", async () => {
      const res = await request(app)
        .put(`/api/v1/reminders/templates/${template1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      expect(res.body.data.template.content).to.equal(updateData.content);
      expect(res.body.data.template.is_active).to.equal(updateData.is_active);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .put(`/api/v1/reminders/templates/${template1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
    });
    // Add validation tests
  });

  describe("DELETE /templates/:id", () => {
    // Requires ReminderTemplate:delete
    it("should delete a template for Admin", async () => {
      await request(app)
        .delete(`/api/v1/reminders/templates/${template1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);
      const deleted = await ReminderTemplate.findById(template1._id);
      expect(deleted).to.not.exist;
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .delete(`/api/v1/reminders/templates/${template1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .delete(`/api/v1/reminders/templates/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // --- Delivery Reports ---
  describe("GET /delivery-reports", () => {
    // Requires Reminder:read
    beforeEach(async () => {
      // Seed some reminder records
      await seedData(Reminder, [
        {
          subscription_id: new mongoose.Types.ObjectId(),
          user_id: new mongoose.Types.ObjectId(),
          channel_id: new mongoose.Types.ObjectId(),
          scheduled_date: new Date(),
          template_name: "Tpl 1",
          status: "delivered",
          message_sid: "SM1",
        },
        {
          subscription_id: new mongoose.Types.ObjectId(),
          user_id: new mongoose.Types.ObjectId(),
          channel_id: new mongoose.Types.ObjectId(),
          scheduled_date: new Date(),
          template_name: "Tpl 2 Exp",
          status: "failed",
          message_sid: "SM2",
        },
      ]);
    });

    it("should get delivery reports for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/reminders/delivery-reports")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.reports).to.be.an("array").with.lengthOf(2);
    });
    it("should filter delivery reports by status", async () => {
      const res = await request(app)
        .get("/api/v1/reminders/delivery-reports?status=failed")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.reports).to.be.an("array").with.lengthOf(1);
      expect(res.body.data.reports[0].status).to.equal("failed");
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/reminders/delivery-reports")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
