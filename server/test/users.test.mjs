// test/users.test.js
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import User from "../src/models/User.js";
import Role from "../src/models/Role.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("User Routes /api/v1/users", () => {
  let superAdminToken, adminToken, supportToken, salesToken, userToken;
  let testUserId, adminUserId, superAdminUserId, supportUserId; // Define supportUserId
  let adminRoleId, userRoleId, salesRoleId;

  before(async () => {
    ({
      token: superAdminToken,
      user: { _id: superAdminUserId },
    } = await loginUser("SuperAdmin", "usrSA"));
    ({
      token: adminToken,
      user: { _id: adminUserId },
    } = await loginUser("Admin", "usrAd"));
    ({
        token: supportToken,
        user: { _id: supportUserId }, // Get support user ID
    } = await loginUser("Support", "usrSu"));
    ({ token: salesToken } = await loginUser("Sales", "usrSa")); // Don't need sales user ID usually
    ({
      token: userToken,
      user: { _id: testUserId },
    } = await loginUser("User", "usrUs"));

    const adminRole = await Role.findOne({ name: "Admin" });
    adminRoleId = adminRole._id;
    const userRole = await Role.findOne({ name: "User" });
    userRoleId = userRole._id;
    const salesRole = await Role.findOne({ name: "Sales" });
    salesRoleId = salesRole._id;
  });

  // No global beforeEach needed if loginUser handles creation/finding

  describe("GET /me", () => {
    it("should get own profile for logged-in user", async () => {
      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.user.id).to.equal(testUserId.toString());
      expect(res.body.data.user.role).to.equal("User");
    });
    it("should fail with 401 if not logged in", async () => {
      await request(app).get("/api/v1/users/me").expect(401);
    });
  });

  describe("POST /me/telegram", () => {
    const telegramId = 123456789;
    it("should link telegram ID for logged-in user", async () => {
      const res = await request(app)
        .post("/api/v1/users/me/telegram")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ telegram_id: telegramId })
        .expect(200);
      const user = await User.findById(testUserId);
      expect(user.telegram_id).to.equal(telegramId);
    });
    // Add validation, conflict, auth tests
  });

  describe("POST /kyc", () => {
    const kycData = { pan_number: "FGHIJ5432K", aadhar_number: "987654321098" };
    it("should submit KYC data for logged-in user", async () => {
      const res = await request(app)
        .post("/api/v1/users/kyc")
        .set("Authorization", `Bearer ${userToken}`)
        .send(kycData)
        .expect(200);
      const user = await User.findById(testUserId);
      expect(user.pan_number).to.equal(kycData.pan_number);
      expect(user.aadhar_number).to.equal(kycData.aadhar_number);
    });
    // Add validation, auth tests
  });

  describe("GET / (Admin View)", () => {
    // Requires User:read:all
    it("should get all users for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.users).to.be.an("array");
    });
    it("should get all users for Support", async () => {
        // Updated: Expect 200 for Support based on seed permissions
       const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${supportToken}`)
        .expect(200);
       expect(res.body.data.users).to.be.an("array");
    });
    it("should fail with 403 for Sales and User", async () => {
        // Updated: Test only Sales and User for 403
      await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
      await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    // Add filtering tests
  });

  describe("GET /:id (Admin View)", () => {
    // Requires User:read
    it("should get a specific user for Admin", async () => {
      await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
    it("should get a specific user for Support", async () => {
        // Updated: Expect 200 for Support based on seed permissions
       await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set("Authorization", `Bearer ${supportToken}`)
        .expect(200);
    });
    it("should fail with 403 for Sales and User", async () => {
        // Updated: Test only Sales and User for 403
      await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
       await request(app)
        .get(`/api/v1/users/${adminUserId}`) // Try getting admin user
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
    // Add not found tests
  });

  describe("PUT /:id/role (SuperAdmin)", () => {
    // Requires User:update:role
    it("should update user role for SuperAdmin", async () => {
        // Ensure the user exists and has a different role initially
        const userToUpdate = await User.findById(testUserId);
        expect(userToUpdate.role_id.toString()).to.not.equal(salesRoleId.toString());

        const res = await request(app)
            .put(`/api/v1/users/${testUserId}/role`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({ role_id: salesRoleId.toString() })
            .expect(200);

        // MODIFIED: Check role_id._id in response
        expect(res.body.data.user.role_id._id.toString()).to.equal(salesRoleId.toString());
        const updatedUser = await User.findById(testUserId);
        expect(updatedUser.role_id.toString()).to.equal(salesRoleId.toString());
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .put(`/api/v1/users/${testUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role_id: salesRoleId })
        .expect(403);
    });
    // Add tests for trying to change own role, another SuperAdmin, invalid role_id, user not found
  });

  describe("GET /export (Admin View)", () => {
    // Requires User:export
    it("should export users as CSV for Admin", async () => {
      await request(app)
        .get("/api/v1/users/export")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect("Content-Type", /csv/);
    });
    it("should fail with 403 for non-Admin/SuperAdmin", async () => {
      await request(app)
        .get("/api/v1/users/export")
        .set("Authorization", `Bearer ${supportToken}`)
        .expect(403);
    });
  });
});
