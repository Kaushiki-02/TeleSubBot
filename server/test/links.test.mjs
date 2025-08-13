// test/links.test.mjs
import { expect } from "chai";
import request from "supertest";

import app from "../server.js"; // Correct import assuming server.js exports app
import Link from "../src/models/Link.js";
import Plan from "../src/models/Plan.js";
import Channel from "../src/models/Channel.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Link Routes /api/v1/links", () => {
  let adminToken, salesToken, otherSalesToken, userToken;
  let salesUserId, otherSalesUserId;
  let channelId; // Declared here, assigned in before hook
  let link1, link2;

  // Use a before hook to ensure data is ready before tests run
  before(async () => {
    // Login users
    ({ token: adminToken } = await loginUser("Admin", "linkAdm"));
    ({
      token: salesToken,
      user: { _id: salesUserId },
    } = await loginUser("Sales", "linkSal1"));
    ({
      token: otherSalesToken,
      user: { _id: otherSalesUserId },
    } = await loginUser("Sales", "linkSal2"));
    ({ token: userToken } = await loginUser("User", "linkUsr"));

    // Seed necessary static data for tests in this file
    await Plan.deleteMany({});
    await Channel.deleteMany({});
    const plan = await seedData(Plan, {
      name: "LPlan",
      discounted_price: 1,
      validity_days: 1,
    });
    const channel = await seedData(Channel, {
      name: "Link Channel",
      telegram_chat_id: "linkchan_test", // Ensure unique chat ID for tests
      associated_plan_ids: [plan._id],
    });
    channelId = channel._id; // Assign channelId HERE
  });

  // Clean up links before each test in this file
  beforeEach(async () => {
    await Link.deleteMany({});
    // Seed links specific to tests, using the already assigned channelId
    link1 = await seedData(Link, {
      name: "Sales Link 1",
      url_slug: "sales-link-1-test", // Make slugs unique for tests
      channel_id: channelId,
      created_by: salesUserId,
    });
    link2 = await seedData(Link, {
      name: "Sales Link 2",
      url_slug: "sales-link-2-test",
      channel_id: channelId,
      created_by: salesUserId,
    });
    await seedData(Link, {
      name: "Other Sales Link",
      url_slug: "other-link-test",
      channel_id: channelId,
      created_by: otherSalesUserId,
    });
  });

  describe("GET /public/:slug", () => {
    it("should get public link details and increment clicks", async () => {
      // Re-fetch link1 to ensure we have the latest data before asserting initial state
      const initialLink = await Link.findById(link1._id);
      expect(initialLink.click_count).to.equal(0);

      const res = await request(app)
        .get(`/api/v1/links/public/${link1.url_slug}`)
        .expect(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.linkName).to.equal(link1.name);
      expect(res.body.data.channelName).to.equal("Link Channel");
      expect(res.body.data.plans).to.be.an("array").with.lengthOf(1);
      expect(res.body.data.plans[0].name).to.equal("LPlan");

      const updatedLink = await Link.findById(link1._id);
      expect(updatedLink.click_count).to.equal(1);
    });
    // Add tests for expired links, usage cap reached, not found (404/410)
  });

  describe("POST /", () => {
    // Define the payload INSIDE the test or a beforeEach within this describe
    it("should allow Sales to create a link", async () => {
      // Define payload here, ensuring channelId is assigned
      const validLinkData = {
        name: "New Campaign",
        channel_id: channelId.toString(), // Now channelId is guaranteed to be defined
      };
      const res = await request(app)
        .post("/api/v1/links")
        .set("Authorization", `Bearer ${salesToken}`)
        .send(validLinkData)
        .expect(201);
      expect(res.body.data.link.created_by.toString()).to.equal(
        salesUserId.toString()
      );
      expect(res.body.data.link.url_slug).to.exist;
    });

    it("should allow Admin to create a link", async () => {
      const validLinkData = {
        name: "Admin Campaign",
        channel_id: channelId.toString(),
      };
      await request(app)
        .post("/api/v1/links")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validLinkData)
        .expect(201); // MODIFIED: Expect 201, not 403
    });

    it("should fail with 403 for User", async () => {
      const validLinkData = {
        name: "User Campaign Fail",
        channel_id: channelId.toString(),
      };
      await request(app)
        .post("/api/v1/links")
        .set("Authorization", `Bearer ${userToken}`)
        .send(validLinkData)
        .expect(403);
    });
    // Add validation tests (missing name, invalid channel_id, duplicate slug if provided)
    it("should fail with 400 if channel_id is missing", async () => {
      await request(app)
        .post("/api/v1/links")
        .set("Authorization", `Bearer ${salesToken}`)
        .send({ name: "No Channel Link" })
        .expect(400);
    });
    it("should fail with 400 if name is missing", async () => {
      await request(app)
        .post("/api/v1/links")
        .set("Authorization", `Bearer ${salesToken}`)
        .send({ channel_id: channelId.toString() })
        .expect(400);
    });
  });

  describe("GET /my-links", () => {
    it("should get only own links for Sales", async () => {
      const res = await request(app)
        .get("/api/v1/links/my-links")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(200);
      expect(res.body.data.links).to.be.an("array").with.lengthOf(2);
      // MODIFIED: Map using l._id
      const linkIds = res.body.data.links.map((l) => l._id);
      expect(linkIds).to.include.members([
        link1._id.toString(),
        link2._id.toString(),
      ]);
    });
    it("should fail with 403 for Admin (use GET / instead)", async () => {
      await request(app)
        .get("/api/v1/links/my-links")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/links/my-links")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("GET / (Admin View)", () => {
    it("should get all links for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/links")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.links).to.be.an("array").with.lengthOf(3); // All seeded links
    });
    it("should fail with 403 for Sales (use /my-links)", async () => {
      await request(app)
        .get("/api/v1/links")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
    });
  });

  describe("GET /:id", () => {
    it("should allow Sales to get own link by ID", async () => {
      await request(app)
        .get(`/api/v1/links/${link1._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(200);
    });
    it("should fail with 403 for Sales trying to get other's link", async () => {
      const otherLink = await Link.findOne({ url_slug: "other-link-test" }); // Use test slug
      await request(app)
        .get(`/api/v1/links/${otherLink._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
    });
    it("should allow Admin to get any link by ID", async () => {
      await request(app)
        .get(`/api/v1/links/${link1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const otherLink = await Link.findOne({ url_slug: "other-link-test" });
      await request(app)
        .get(`/api/v1/links/${otherLink._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .get(`/api/v1/links/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
    it("should fail with 400 for invalid ID format", async () => {
      await request(app)
        .get(`/api/v1/links/invalid-id-format`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400); // Caught by validation middleware
    });
  });

  // Add tests for PUT /:id, DELETE /:id, POST /import, GET /export/all following similar logic
});
