// test/settings.test.js
// No changes were needed in this file based on the last error log.
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import Setting from "../src/models/Setting.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Setting Routes /api/v1/settings", () => {
  let superAdminToken, adminToken;
  const settingKey = "default_reminder_days";
  const settingValue = 2;

  before(async () => {
    ({ token: superAdminToken } = await loginUser("SuperAdmin", "setSA"));
    ({ token: adminToken } = await loginUser("Admin", "setAd")); // Assuming Admin has Setting:read
  });

  beforeEach(async () => {
    await Setting.deleteMany({});
    await seedData(Setting, {
      key: settingKey,
      value: settingValue,
      type: "number",
      description: "Default days",
    });
  });

  describe("GET /", () => {
    // Requires Setting:read
    it("should get all settings for SuperAdmin", async () => {
      await seedData(Setting, { key: "site_name", value: "My CRM" });
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.data.settings).to.be.an("array").with.lengthOf(2);
    });
    it("should get all settings for Admin", async () => {
      await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe("GET /:key", () => {
    // Requires Setting:read
    it("should get a specific setting by key for SuperAdmin", async () => {
      await request(app)
        .get(`/api/v1/settings/${settingKey}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);
    });
    it("should fail with 404 for non-existent key", async () => {
      await request(app)
        .get("/api/v1/settings/nonexistent_key")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  describe("PUT /:key", () => {
    // Requires Setting:manage (SuperAdmin)
    const updatePayload = { value: 3, description: "Updated days" };
    it("should update a setting for SuperAdmin", async () => {
      await request(app)
        .put(`/api/v1/settings/${settingKey}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(updatePayload)
        .expect(200);
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .put(`/api/v1/settings/${settingKey}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatePayload)
        .expect(403);
    });
    // Add 400, 404 tests
  });

  describe("POST /", () => {
    // Requires Setting:manage (SuperAdmin)
    const newSettingData = {
      key: "post_setting",
      value: "hello",
      type: "string",
    };
    it("should create a setting for SuperAdmin", async () => {
      await request(app)
        .post("/api/v1/settings")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(newSettingData)
        .expect(201);
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .post("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newSettingData)
        .expect(403);
    });
    // Add 400 tests (missing key/value, duplicate key)
  });

  describe("DELETE /:key", () => {
    // Requires Setting:manage (SuperAdmin)
    it("should delete a setting for SuperAdmin", async () => {
      await request(app)
        .delete(`/api/v1/settings/${settingKey}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(204);
    });
    it("should fail with 403 for Admin", async () => {
      await request(app)
        .delete(`/api/v1/settings/${settingKey}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
    // Add 404 test
  });
});
