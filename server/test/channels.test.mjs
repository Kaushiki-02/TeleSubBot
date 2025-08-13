// test/channels.test.js
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import Channel from "../src/models/Channel.js";
import Plan from "../src/models/Plan.js";
import Subscription from "../src/models/Subscription.js";
import { loginUser, seedData } from "./helpers.mjs";
import mongoose from "mongoose";

describe("Channel Routes /api/v1/channels", () => {
  let adminToken, salesToken, userToken;
  let planId1, planId2;
  let channel1, channel2;

  before(async () => {
    ({ token: adminToken } = await loginUser("Admin", "chAdm"));
    ({ token: salesToken } = await loginUser("Sales", "chSal"));
    ({ token: userToken } = await loginUser("User", "chUsr"));
  });

  beforeEach(async () => {
    await Channel.deleteMany({});
    await Plan.deleteMany({});
    await Subscription.deleteMany({}); // Clear subs that might reference channels

    [planId1, planId2] = (
      await seedData(Plan, [
        { name: "P1", discounted_price: 10, validity_days: 30, is_active: true }, // Ensure active
        { name: "P2", discounted_price: 20, validity_days: 60, is_active: true }, // Ensure active
      ])
    ).map((p) => p._id);

    channel1 = await seedData(Channel, {
      name: "Channel One",
      telegram_chat_id: "@chan1",
      associated_plan_ids: [planId1],
    });
    channel2 = await seedData(Channel, {
      name: "Channel Two",
      telegram_chat_id: "-100123",
      associated_plan_ids: [], // Explicitly empty
    });
  });

  describe("GET /", () => {
    it("should get all channels for Admin", async () => {
      const res = await request(app)
        .get("/api/v1/channels")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.channels).to.be.an("array").with.lengthOf(2);
      // Check populated plans for channel1
      const chan1 = res.body.data.channels.find(
        (c) => c._id === channel1._id.toString() // MODIFIED: Check _id
      );
      expect(chan1).to.exist; // ADDED: Check if find worked
      expect(chan1.associated_plan_ids).to.be.an("array").with.lengthOf(1);
      expect(chan1.associated_plan_ids[0].name).to.equal("P1");
      // Check channel2 has empty plans array
      const chan2 = res.body.data.channels.find(
        (c) => c._id === channel2._id.toString() // MODIFIED: Check _id
      );
      expect(chan2).to.exist;
      expect(chan2.associated_plan_ids).to.be.an("array").with.lengthOf(0);
    });
    it("should get all channels for Sales", async () => {
      await request(app)
        .get("/api/v1/channels")
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(200);
    });
    it("should fail with 403 for User", async () => {
      await request(app)
        .get("/api/v1/channels")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("POST /", () => {
    const validChannelData = {
      name: "New Channel",
      telegram_chat_id: "@newchan",
      associated_plan_ids: [],
    };
    it("should create a channel for Admin", async () => {
      const res = await request(app)
        .post("/api/v1/channels")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validChannelData, associated_plan_ids: [planId1, planId2] })
        .expect(201);
      expect(res.body.data.channel.name).to.equal(validChannelData.name);
      expect(res.body.data.channel.associated_plan_ids).to.have.lengthOf(2);
    });
    it("should fail with 403 for Sales", async () => {
      await request(app)
        .post("/api/v1/channels")
        .set("Authorization", `Bearer ${salesToken}`)
        .send(validChannelData)
        .expect(403);
    });
    it("should fail with 400 if name is missing", async () => {
      await request(app)
        .post("/api/v1/channels")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ telegram_chat_id: "123" })
        .expect(400);
    });
    it("should fail with 400 if telegram_chat_id is missing", async () => {
      await request(app)
        .post("/api/v1/channels")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "No ID Chan" })
        .expect(400);
    });
    it("should fail with 409 for duplicate telegram_chat_id", async () => {
      await request(app)
        .post("/api/v1/channels")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validChannelData, telegram_chat_id: "@chan1" })
        .expect(409); // MODIFIED: Changed expectation to 409
    });
    it("should fail with 400 for invalid associated_plan_ids", async () => {
      await request(app)
        .post("/api/v1/channels")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...validChannelData,
          associated_plan_ids: [new mongoose.Types.ObjectId()], // ID of a non-existent plan
        })
        .expect(400); // Controller validation should catch this
    });
    it("should allow creating with empty associated_plan_ids", async () => {
      await request(app)
        .post("/api/v1/channels")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validChannelData)
        .expect(201);
    });
  });

  describe("GET /:id", () => {
    it("should get a channel by ID for Admin", async () => {
      const res = await request(app)
        .get(`/api/v1/channels/${channel1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.channel.name).to.equal(channel1.name);
      expect(res.body.data.channel.associated_plan_ids[0].name).to.equal("P1");
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .get(`/api/v1/channels/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("PUT /:id", () => {
    // MODIFIED: Simplified payload for isolation
    const updateDataDescOnly = { description: "Updated Desc Only" };
    const updateDataFull = {
      description: "Updated Full",
      associated_plan_ids: [planId2],
    };
    it("should update a channel for Admin", async () => {
      const res = await request(app)
        .put(`/api/v1/channels/${channel1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateDataFull)
        .expect(200);
      expect(res.body.data.channel.description).to.equal(
        updateDataFull.description
      );
      expect(res.body.data.channel.associated_plan_ids)
        .to.be.an("array")
        .with.lengthOf(1);
      // Check the populated object's _id
      expect(
        res.body.data.channel.associated_plan_ids[0]._id.toString() // MODIFIED: Use _id
      ).to.equal(planId2.toString());
    });
    it("should allow clearing associated plans", async () => {
      const res = await request(app)
        .put(`/api/v1/channels/${channel1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ associated_plan_ids: [] })
        .expect(200);
      expect(res.body.data.channel.associated_plan_ids)
        .to.be.an("array")
        .with.lengthOf(0);
    });
    it("should fail with 403 for Sales", async () => {
      await request(app)
        .put(`/api/v1/channels/${channel1._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .send(updateDataFull)
        .expect(403);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .put(`/api/v1/channels/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateDataDescOnly) // MODIFIED: Use simplified payload
        .expect(404);
    });
    it("should fail with 400 for invalid associated_plan_ids", async () => {
      await request(app)
        .put(`/api/v1/channels/${channel1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ associated_plan_ids: ["invalid"] })
        .expect(400);
    });
  });

  describe("DELETE /:id", () => {
    it("should delete a channel with no active subscriptions for Admin", async () => {
      await request(app)
        .delete(`/api/v1/channels/${channel2._id}`) // channel2 has no subs seeded
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);
      const deletedChannel = await Channel.findById(channel2._id);
      expect(deletedChannel).to.not.exist;
    });
    it("should fail to delete a channel with active subscriptions", async () => {
      // Seed an active subscription for channel1
      const { user } = await loginUser("User", "subUser"); // Ensure this user exists
      await seedData(Subscription, {
        user_id: user._id,
        plan_id: planId1,
        channel_id: channel1._id,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "active",
      });

      const res = await request(app)
        .delete(`/api/v1/channels/${channel1._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
      expect(res.body.message).to.include(
        "Cannot delete channel with 1 active subscription"
      );
      const channelExists = await Channel.findById(channel1._id);
      expect(channelExists).to.exist;
    });
    it("should fail with 403 for Sales", async () => {
      await request(app)
        .delete(`/api/v1/channels/${channel2._id}`)
        .set("Authorization", `Bearer ${salesToken}`)
        .expect(403);
    });
    it("should fail with 404 for non-existent ID", async () => {
      await request(app)
        .delete(`/api/v1/channels/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
