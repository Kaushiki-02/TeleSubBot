// test/faqs.test.js
// No changes were needed in this file based on the last error log.
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import FAQ from "../src/models/FAQ.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("FAQ Routes /api/v1/faqs", () => {
  let adminToken, userToken; // Assuming Admin has FAQ:manage & FAQ:read
  let faq1, faq2_inactive;

  before(async () => {
    ({ token: adminToken } = await loginUser("Admin", "faqAdm"));
    ({ token: userToken } = await loginUser("User", "faqUsr"));
  });

  beforeEach(async () => {
    await FAQ.deleteMany({});
    faq1 = await seedData(FAQ, {
      question: "Q1?",
      answer: "A1",
      is_active: true,
      display_order: 1,
    });
    faq2_inactive = await seedData(FAQ, {
      question: "Q2 Inactive?",
      answer: "A2",
      is_active: false,
    });
  });

  describe("GET /active", () => {
    // Public
    it("should get only active FAQs", async () => {
      const res = await request(app).get("/api/v1/faqs/active").expect(200);
      expect(res.body.data.faqs).to.be.an("array").with.lengthOf(1);
      expect(res.body.data.faqs[0].question).to.equal("Q1?");
    });
  });

  describe("GET / (Management)", () => {
    // Requires FAQ:read
    it("should get all FAQs for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/faqs")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.faqs).to.be.an("array").with.lengthOf(2);
    });
    it("should fail with 403 for User (lacking FAQ:read)", async () => {
      await request(app)
        .get("/api/v1/faqs")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("POST /", () => {
    // Requires FAQ:manage
    const validFaqData = { question: "New Q?", answer: "New A" };
    it("should create an FAQ for Admin", async () => {
      const res = await request(app)
        .post("/api/v1/faqs")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validFaqData)
        .expect(201);
      expect(res.body.data.faq.question).to.equal(validFaqData.question);
    });
    it("should fail with 403 for User (lacking FAQ:manage)", async () => {
      await request(app)
        .post("/api/v1/faqs")
        .set("Authorization", `Bearer ${userToken}`)
        .send(validFaqData)
        .expect(403);
    });
    // Add validation tests
  });

  describe("GET /:id", () => {
    // Requires FAQ:read
    it("should get a specific FAQ for Admin", async () => {
      await request(app)
        .get(`/api/v1/faqs/${faq1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get(`/api/v1/faqs/${faq1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    // Add 404 test
  });

  describe("PUT /:id", () => {
    // Requires FAQ:manage
    const updateData = { answer: "Updated Answer", is_active: false };
    it("should update an FAQ for Admin", async () => {
      await request(app)
        .put(`/api/v1/faqs/${faq1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .put(`/api/v1/faqs/${faq1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
    });
    // Add 404 test
  });

  describe("DELETE /:id", () => {
    // Requires FAQ:manage
    it("should delete an FAQ for Admin", async () => {
      await request(app)
        .delete(`/api/v1/faqs/${faq1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .delete(`/api/v1/faqs/${faq1._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    // Add 404 test
  });
});
