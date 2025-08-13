// test/plans.test.js
// No changes were needed in this file based on the last error log,
// assuming the seeding error was fixed in models/Plan.js.
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import Plan from "../src/models/Plan.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Plan Routes /api/v1/plans", () => {
  let adminToken, salesToken, userToken;
  let plan1;

  before(async () => {
    ({ token: adminToken } = await loginUser("Admin", "planAdm"));
    ({ token: salesToken } = await loginUser("Sales", "planSl"));
    ({ token: userToken } = await loginUser("User", "planUsr"));
  });

  beforeEach(async () => {
    await Plan.deleteMany({});
    plan1 = await seedData(Plan, {
      name: "Monthly Test",
      discounted_price: 100,
      validity_days: 30,
      is_active: true,
    });
    await seedData(Plan, {
      name: "Inactive Test",
      discounted_price: 50,
      validity_days: 15,
      is_active: false,
    });
  });

  describe("GET /active", () => {
    it("should get only active plans (public)", async () => {
      const res = await request(app).get("/api/v1/plans/active").expect(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.plans).to.be.an("array").with.lengthOf(1);
      expect(res.body.data.plans[0].name).to.equal("Monthly Test");
      expect(res.body.data.plans[0].is_active).to.be.true;
      expect(res.body.data.plans[0]).to.have.property("discount_percentage");
    });
  });

  describe("GET / (Management)", () => {
    it("should get all plans for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.plans).to.be.an("array").with.lengthOf(2);
    });
    it("should get all plans for Sales", async () => {
      const res = await request(app)
        .get("/api/v1/plans")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(200);
      expect(res.body.data.plans).to.be.an("array").with.lengthOf(2);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/plans")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("POST /", () => {
    const validPlanData = {
      name: "Quarterly",
      discounted_price: 250,
      validity_days: 90,
      markup_price: 300,
    };

    it("should create a plan for Admin", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validPlanData)
        .expect(201);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.plan.name).to.equal(validPlanData.name);
      const planInDb = await Plan.findById(res.body.data.plan.id);
      expect(planInDb).to.exist;
    });
    it("should fail with 403 for Sales", async () => {
      await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${salesToken}`)
        .send(validPlanData)
        .expect(403);
    });
    it("should fail with 400 if name is missing", async () => {
      const { name, ...invalidData } = validPlanData;
      await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });
    it("should fail with 400 if markup_price < discounted_price", async () => {
      await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validPlanData, markup_price: 200 })
        .expect(400);
    });
    // Add tests for other validation rules (price >= 0, validity >= 1)
  });

  describe("GET /:id", () => {
    it("should get a plan by ID for Admin", async () => {
      const res = await request(app)
        .get(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.plan.name).to.equal(plan1.name);
    });
    it("should get a plan by ID for Sales", async () => {
      await request(app)
        .get(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(200);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .get(`/api/v1/plans/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("PUT /:id", () => {
    const updateData = { name: "Updated Monthly", discounted_price: 110 };
    it("should update a plan for Admin", async () => {
      const res = await request(app)
        .put(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      expect(res.body.data.plan.name).to.equal(updateData.name);
      expect(res.body.data.plan.discounted_price).to.equal(
        updateData.discounted_price
      );
      const updatedPlan = await Plan.findById(plan1._id);
      expect(updatedPlan.name).to.equal(updateData.name);
    });
    it("should fail with 403 for Sales", async () => {
      await request(app)
        .put(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .send(updateData)
        .expect(403);
    });
    it("should fail with 400 for invalid update data", async () => {
      await request(app)
        .put(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ discounted_price: -10 })
        .expect(400);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .put(`/api/v1/plans/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe("DELETE /:id", () => {
    // Deactivate Plan
    it("should deactivate (soft delete) a plan for Admin", async () => {
      expect(plan1.is_active).to.be.true;
      const res = await request(app)
        .delete(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200); // 200 OK for soft delete update
      expect(res.body.status).to.equal("success");
      expect(res.body.message).to.include("deactivated");
      const deactivatedPlan = await Plan.findById(plan1._id);
      expect(deactivatedPlan.is_active).to.be.false;
    });
    it("should fail with 403 for Sales", async () => {
      await request(app)
        .delete(`/api/v1/plans/${plan1._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .delete(`/api/v1/plans/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
