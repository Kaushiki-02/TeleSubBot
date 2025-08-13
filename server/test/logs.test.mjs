// test/logs.test.js
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import Log from "../src/models/Log.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Log Routes /api/v1/logs", () => {
  let superAdminToken, adminToken;
  let adminUser; // Define adminUser

  before(async () => {
    ({ token: superAdminToken } = await loginUser("SuperAdmin", "logSA"));
    ({
      token: adminToken,
      user: adminUser, // Assign user object
    } = await loginUser("Admin", "logAdm"));
  });

  beforeEach(async () => {
    await Log.deleteMany({});
    // Seed some logs
    await seedData(Log, [
      {
        actor_type: "System",
        action_type: "AUTO_REVOCATION",
        description: "Sub 1 expired",
        timestamp: new Date("2024-01-10T10:00:00Z"),
      },
      {
        actor_type: "Admin",
        actor_id: adminUser._id, // Use the ID from the logged-in user
        action_type: "PLAN_UPDATED",
        description: "Plan updated",
        timestamp: new Date("2024-01-10T11:00:00Z"),
      },
      {
        actor_type: "User",
        actor_id: new mongoose.Types.ObjectId(),
        action_type: "USER_KYC_SUBMITTED",
        description: "User submitted KYC",
        timestamp: new Date("2024-01-10T12:00:00Z"),
      },
    ]);
  });

  describe("GET /", () => {
    // Requires Log:read (SuperAdmin)
    it("should get audit logs for SuperAdmin", async () => {
      const res = await request(app)
        .get("/api/v1/logs")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.data.logs).to.be.an("array").with.lengthOf(3);
    });
    it("should filter logs by action_type for SuperAdmin", async () => {
      const res = await request(app)
        .get("/api/v1/logs?action_type=PLAN_UPDATED")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.data.logs).to.be.an("array").with.lengthOf(1);
      expect(res.body.data.logs[0].action_type).to.equal("PLAN_UPDATED");
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .get("/api/v1/logs")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
    // Add more filter tests (date, actor_type, actor_id)
  });

  describe("GET /export", () => {
    // Requires Log:export (SuperAdmin)
    it("should export logs as CSV for SuperAdmin", async () => {
      const res = await request(app)
        .get("/api/v1/logs/export?format=csv")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)
        .expect("Content-Type", /csv/)
        .expect(
          "Content-Disposition",
          /attachment; filename=crm_audit_logs.csv/
        );
      // Updated assertion to check for quoted headers
      expect(res.text).to.include('\"Timestamp\",\"Actor Type\",\"Actor Phone\"'); 
      expect(res.text).to.include("PLAN_UPDATED");
    });
    it("should export logs as PDF (placeholder) for SuperAdmin", async () => {
       // Updated assertion to expect 200 OK and PDF content type
      await request(app)
        .get("/api/v1/logs/export?format=pdf")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200) 
        .expect('Content-Type', /pdf/) 
        .expect('Content-Disposition', /attachment; filename=crm_audit_logs.pdf/);
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .get("/api/v1/logs/export")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
    it("should fail with 404 if no logs match filter for export", async () => {
      await request(app)
        .get("/api/v1/logs/export?action_type=NON_EXISTENT")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });
});
