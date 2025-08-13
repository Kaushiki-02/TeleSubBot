// test/roles.test.js
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import Role from "../src/models/Role.js";
import Permission from "../src/models/Permission.js";
import User from "../src/models/User.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Role & Permission Assignment Routes /api/v1/roles & /permissions", () => {
  let superAdminToken, adminToken, userToken;
  let readPlanPermId, createPlanPermId, readUserOwnPermId;
  let adminRoleId, salesRoleId, userRoleId;
  let assignedUser; // Define user for assigned role test
  let testUserId;   // Declare testUserId in the higher scope

  before(async () => {
    ({ token: superAdminToken } = await loginUser("SuperAdmin", "roleSA"));
    ({ token: adminToken } = await loginUser("Admin", "roleAd"));
    ({ token: userToken, user: assignedUser } = await loginUser("User", "roleUs")); // Get user object
    testUserId = assignedUser._id; // Assign testUserId *after* assignedUser is populated

    // Get some permission IDs (assuming they were seeded in setup)
    const readPlanPerm = await Permission.findOne({
      resource: "Plan",
      action: "read",
    });
    readPlanPermId = readPlanPerm._id;
    const createPlanPerm = await Permission.findOne({
      resource: "Plan",
      action: "create",
    });
    createPlanPermId = createPlanPerm._id;
    const readUserOwnPerm = await Permission.findOne({
      resource: "User",
      action: "read:own",
    });
    readUserOwnPermId = readUserOwnPerm._id;

    // Get Role IDs
    adminRoleId = (await Role.findOne({ name: "Admin" }))._id;
    salesRoleId = (await Role.findOne({ name: "Sales" }))._id;
    userRoleId = (await Role.findOne({ name: "User" }))._id;
  });

  beforeEach(async () => {
    // Clean only custom roles if needed, core roles are assumed static from seeding
    await Role.deleteMany({
      name: { $nin: ["SuperAdmin", "Admin", "Sales", "Support", "User"] },
    });
  });

  // --- Role Management ---
  describe("GET /roles", () => {
    // Requires Role:read
    it("should get all roles for SuperAdmin", async () => {
      const res = await request(app)
        .get("/api/v1/roles")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.data.roles)
        .to.be.an("array")
        .with.length.greaterThanOrEqual(5); // Core roles
    });
    it("should fail with 403 for Admin (if Admin role lacks Role:read)", async () => {
      // Assuming default Admin role does NOT have Role:read permission
      await request(app)
        .get("/api/v1/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe("POST /roles", () => {
    // Requires Role:create
    const customRoleData = { name: "TesterRole", description: "For testing" };

    it("should create a new role for SuperAdmin", async () => {
      const res = await request(app)
        .post("/api/v1/roles")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ ...customRoleData, permissionIds: [readUserOwnPermId] })
        .expect(201);
      expect(res.body.data.role.name).to.equal(customRoleData.name);
      expect(res.body.data.role.permissions[0].toString()).to.equal( // Check string ID
        readUserOwnPermId.toString()
      );
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .post("/api/v1/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(customRoleData)
        .expect(403);
    });
    it("should fail with 409 for duplicate role name", async () => {
      // Updated expectation to 409 Conflict based on errorMiddleware
      await request(app)
        .post("/api/v1/roles")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ name: "Admin" })
        .expect(409);
    });
    it("should fail with 400 for invalid permissionIds", async () => {
      await request(app)
        .post("/api/v1/roles")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ ...customRoleData, permissionIds: ["invalidId"] })
        .expect(400);
    });
  });

  describe("GET /roles/:id", () => {
    // Requires Role:read
    it("should get a specific role for SuperAdmin", async () => {
      const res = await request(app)
        .get(`/api/v1/roles/${adminRoleId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.data.role.name).to.equal("Admin");
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .get(`/api/v1/roles/${adminRoleId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe("PUT /roles/:id", () => {
    // Requires Role:update
    let customRole;
    beforeEach(async () => {
      customRole = await seedData(Role, {
        name: "TemporaryRole",
        permissions: [readUserOwnPermId],
      });
    });

    it("should update a custom role for SuperAdmin", async () => {
      const updatePayload = {
        description: "Updated Desc",
        permissionIds: [readPlanPermId],
      };
      const res = await request(app)
        .put(`/api/v1/roles/${customRole._id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(updatePayload)
        .expect(200);
      expect(res.body.data.role.description).to.equal(
        updatePayload.description
      );
      expect(res.body.data.role.permissions).to.have.lengthOf(1);
      // MODIFIED: Updated assertion to compare string _id
      expect(res.body.data.role.permissions[0]._id.toString()).to.equal(
        readPlanPermId.toString()
      );
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .put(`/api/v1/roles/${customRole._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ description: "Fail" })
        .expect(403);
    });
    it("should fail with 403 when trying to update core role (e.g., Admin)", async () => {
      await request(app)
        .put(`/api/v1/roles/${adminRoleId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ description: "Try update core" })
        .expect(403);
    });
    it("should fail with 400 for invalid permissionIds", async () => {
      await request(app)
        .put(`/api/v1/roles/${customRole._id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ permissionIds: ["invalid"] })
        .expect(400);
    });
  });

  describe("DELETE /roles/:id", () => {
    // Requires Role:delete
    let customRole;
    // testUserId is now available from the outer scope

    beforeEach(async () => {
      customRole = await seedData(Role, {
        name: "ToDeleteRole",
        permissions: [],
      });
      // Reset test user's role before each delete test, except the one testing assigned role
      // Ensure testUserId is valid before using it
      if (testUserId) {
         await User.findByIdAndUpdate(testUserId, { role_id: userRoleId });
      } else {
          console.warn("Skipping user role reset in beforeEach for DELETE /roles/:id - testUserId not set");
      }
    });

    it("should delete a custom role for SuperAdmin", async () => {
      await request(app)
        .delete(`/api/v1/roles/${customRole._id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(204);
      const deletedRole = await Role.findById(customRole._id);
      expect(deletedRole).to.not.exist;
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .delete(`/api/v1/roles/${customRole._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
    it("should fail with 400 when trying to delete core role", async () => {
      await request(app)
        .delete(`/api/v1/roles/${salesRoleId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(400);
    });
    it("should fail with 400 when trying to delete role assigned to user", async () => {
      // Ensure testUserId is valid before proceeding
      expect(testUserId, "testUserId must be defined for this test").to.exist;
      // Assign the custom role to the test user
      await User.findByIdAndUpdate(testUserId, { role_id: customRole._id });

      await request(app)
        .delete(`/api/v1/roles/${customRole._id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(400);
    });
    it("should fail with 404 for non-existent role ID", async () => {
      await request(app)
        .delete(`/api/v1/roles/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  // --- Permission Management ---
  describe("GET /permissions", () => {
    // Requires Role:assign:permissions
    it("should get all permissions for SuperAdmin", async () => {
      const res = await request(app)
        .get("/api/v1/permissions")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.data.permissions)
        .to.be.an("array")
        .with.length.greaterThan(10); // Check based on seeded count
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .get("/api/v1/permissions")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe("GET /roles/:roleId/permissions", () => {
    // Requires Role:read
    it("should get permissions for a specific role for SuperAdmin", async () => {
      const res = await request(app)
        .get(`/api/v1/roles/${salesRoleId}/permissions`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.data.permissions).to.be.an("array");
      // Add check for specific known permission for Sales
      const salesPerms = res.body.data.permissions.map(
        (p) => `${p.resource}:${p.action}`
      );
      expect(salesPerms).to.include("Link:create");
      expect(salesPerms).to.not.include("Plan:create");
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .get(`/api/v1/roles/${salesRoleId}/permissions`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe("PUT /roles/:roleId/permissions", () => {
    // Requires Role:assign:permissions
    let customRole;
    beforeEach(async () => {
      customRole = await seedData(Role, {
        name: "PermAssignRole",
        permissions: [],
      });
    });

    it("should assign permissions to a role for SuperAdmin", async () => {
      const permIdsToAssign = [readPlanPermId, createPlanPermId];
      const res = await request(app)
        .put(`/api/v1/roles/${customRole._id}/permissions`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ permissionIds: permIdsToAssign.map(id => id.toString()) }) // Send strings
        .expect(200);

      expect(res.body.data.role.permissions).to.have.lengthOf(2);
      // Updated assertion to map response objects to strings before comparison
      expect(res.body.data.role.permissions.map(p => p._id.toString()))
        .to.include.members(permIdsToAssign.map(p => p.toString()));

      const updatedRole = await Role.findById(customRole._id);
      expect(updatedRole.permissions).to.have.lengthOf(2);
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .put(`/api/v1/roles/${customRole._id}/permissions`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ permissionIds: [] })
        .expect(403);
    });
    it("should fail with 400 for invalid permissionIds array", async () => {
      await request(app)
        .put(`/api/v1/roles/${customRole._id}/permissions`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ permissionIds: ["invalid"] })
        .expect(400);
    });
    it("should fail with 403 when trying to modify SuperAdmin role permissions", async () => {
      const superAdminRole = await Role.findOne({ name: "SuperAdmin" });
      await request(app)
        .put(`/api/v1/roles/${superAdminRole._id}/permissions`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ permissionIds: [] })
        .expect(403);
    });
  });
});
