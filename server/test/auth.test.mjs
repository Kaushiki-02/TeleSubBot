// test/auth.test.js
// No changes were needed in this file based on the last error log.
import { expect } from "chai";
import request from "supertest";

import app from "../server.js";
import User from "../src/models/User.js";
import Role from "../src/models/Role.js";
import { loginUser } from "./helpers.mjs";
import sinon from "sinon";
import notificationService from "../src/services/notificationService.js";
let sendOtpStub;

describe("Authentication Routes /api/v1/auth", () => {
  let userRoleId;

  before(async () => {
    const userRole = await Role.findOne({ name: "User" });
    if (!userRole) throw new Error("User role not found during setup.");
    userRoleId = userRole._id;
  });

  beforeEach(async () => {
    await User.deleteMany({});
    sendOtpStub = sinon
      .stub(notificationService, "sendOtp")
      .resolves({ success: true, messageSid: "fake_sid" });
  });

  afterEach(() => {
    sendOtpStub.restore();
  });

  describe("POST /otp/request", () => {
    const validPhone = "+919999999901";
    const invalidPhone = "12345";

    it("should send OTP for a new user and assign default User role", async () => {
      const res = await request(app)
        .post("/api/v1/auth/otp/request")
        .send({ phone: validPhone })
        .expect(200);

      expect(res.body.status).to.equal("success");
      expect(sendOtpStub.calledOnce).to.be.true;
      expect(sendOtpStub.calledWith(validPhone)).to.be.true;

      // Verify user created in DB and OTP/Expiry fields exist
      const user = await User.findOne({ phone: validPhone }).select(
        "+otp +otp_expires"
      ); // <-- ADD SELECT +otp +otp_expires
      expect(user).to.exist;
      expect(user.role_id.toString()).to.equal(userRoleId.toString());
      expect(user.otp).to.exist; // <-- This assertion should now pass
      expect(user.otp_expires).to.exist;
      expect(user.otp_expires > new Date()).to.be.true;
    });

    it("should send OTP for an existing user", async () => {
      await User.create({ phone: validPhone, role_id: userRoleId });
      await request(app)
        .post("/api/v1/auth/otp/request")
        .send({ phone: validPhone })
        .expect(200);
      expect(sendOtpStub.calledOnce).to.be.true;
    });

    it("should fail with 400 for missing phone number", async () => {
      await request(app).post("/api/v1/auth/otp/request").send({}).expect(400);
    });

    it("should fail with 400 for invalid phone format", async () => {
      await request(app)
        .post("/api/v1/auth/otp/request")
        .send({ phone: invalidPhone })
        .expect(400);
    });
    // Test OTP send failure simulation if needed
  });

  describe("POST /otp/verify", () => {
    const phone = "+919999999902";
    const correctOtp = "123456";

    beforeEach(async () => {
      await User.create({
        phone,
        role_id: userRoleId,
        otp: correctOtp,
        otp_expires: new Date(Date.now() + 5 * 60 * 1000),
      });
    });

    it("should verify correct OTP, return JWT with role, and clear OTP", async () => {
      const res = await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ phone: phone, otp: correctOtp })
        .expect(200);

      expect(res.body.status).to.equal("success");
      expect(res.body.token).to.exist;
      expect(res.body.data.user.role).to.equal("User");
      expect(res.body.data.user.isVerified).to.be.true;

      const user = await User.findOne({ phone: phone }).select("+otp");
      expect(user.otp).to.be.undefined;
      expect(user.otp_verified_at).to.exist;
    });

    it("should fail with 400 for incorrect OTP", async () => {
      await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ phone: phone, otp: "wrongotp" })
        .expect(400);
    });

    it("should fail with 400 for expired OTP", async () => {
      await User.updateOne(
        { phone: phone },
        { otp_expires: new Date(Date.now() - 1000) }
      );
      await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ phone: phone, otp: correctOtp })
        .expect(400);
    });
    // Test for missing user / otp already handled in controller logic returning 400 Invalid OTP
  });

  describe("POST /logout", () => {
    it("should return 200 OK when logged in", async () => {
      const { token } = await loginUser("User", "logout");
      await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });
    it("should fail with 401 if not logged in", async () => {
      await request(app).post("/api/v1/auth/logout").expect(401);
    });
  });
});
