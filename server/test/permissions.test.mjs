// test/permissions.test.js
// No changes were needed in this file based on the last error log.
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import Permission from "../src/models/Permission.js";
import { loginUser } from "./helpers.mjs";

describe("Permission Routes /api/v1/permissions", () => {
  let superAdminToken;

  before(async () => {
    ({ token: superAdminToken } = await loginUser("SuperAdmin", "permSA"));
    // Permissions are seeded globally in setup.js
  });

  describe("GET /", () => {
    // Requires Role:assign:permissions
    it("should get all defined permissions for SuperAdmin", async () => {
      const res = await request(app)
        .get("/api/v1/permissions")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.status).to.equal("success");
      expect(res.body.data.permissions).to.be.an("array");
      // Check if a known permission exists
      const planReadPerm = res.body.data.permissions.find(
        (p) => p.resource === "Plan" && p.action === "read"
      );
      expect(planReadPerm).to.exist;
      expect(planReadPerm.description).to.exist;
    });

    it("should fail with 403 for non-SuperAdmin (e.g., Admin)", async () => {
      const { token: adminToken } = await loginUser("Admin", "permAd");
      await request(app)
        .get("/api/v1/permissions")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403); // Assuming Admin doesn't have Role:assign:permissions
    });
  });

  // Note: POST, PUT, DELETE for permissions are generally not exposed via API
  // They are typically managed via code/seeding. If API endpoints were added,
  // tests for them would go here, requiring SuperAdmin permissions.
});
