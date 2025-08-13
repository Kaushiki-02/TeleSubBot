const User = require("../models/User");
const Role = require("../models/Role");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const otpHelper = require("../utils/otpHelper");
const jwtHelper = require("../utils/jwtHelper");
const notificationService = require("../services/notificationService");
const logger = require("../utils/logger");

exports.requestOtp = catchAsync(async (req, res, next) => {
  const { phone, role: requestedRoleName } = req.body;

  if (requestedRoleName !== "User") {
    return next(
      new AppError("OTP login is only available for User accounts.", 400)
    );
  }

  // **Step 1: Find if a user with this phone number already exists**
  let user = await User.findOne({ phone: phone }).populate("role_id");

  const otp = otpHelper.generateOtp();
  const otp_expires = otpHelper.getOtpExpiry();

  if (user) {
    // **Step 2: User exists - Check if the role matches the requested login path role**

    const actualRoleName = user.role_id?.name;

    if (!actualRoleName) {
      console.error(
        `CRITICAL: User ${user._id} found with phone ${phone} but no associated role.`
      );
      return next(
        new AppError(
          "Account configuration error. Please contact support.",
          500
        )
      );
    }

    if (actualRoleName !== requestedRoleName) {
      console.log(
        `Login attempt for ${phone}: requested role '${requestedRoleName}' does not match actual role '${actualRoleName}'.`
      );
      logger.logAction({
        actor_type: "System",
        action_type: "LOGIN_ROLE_MISMATCH",
        description: `Login attempt for ${phone}: requested role '${requestedRoleName}' does not match actual role '${actualRoleName}'.`,
        details: {
          phone,
          requestedRole: requestedRoleName,
          actualRole: actualRoleName,
        },
      });
      return next(
        new AppError(
          `This phone number is registered under a '${actualRoleName}' account. Please use the correct login page.`,
          403
        )
      );
    }

    // Roles match: Update OTP for the existing user
    console.log(`Updating OTP for existing user ${phone} (${actualRoleName}).`);
    user.otp = otp;
    user.otp_expires = otp_expires;
    await user.save({ validateBeforeSave: false });
  } else {
    // **Step 3: User does NOT exist - Create a new user with the requested role ('User')**
    console.log(
      `Phone number ${phone} not found. Attempting to create new user with role '${requestedRoleName}'.`
    );

    // Find the role ID for the requested role name
    const newRole = await Role.findOne({ name: requestedRoleName }); // This will be 'User'
    if (!newRole) {
      console.error(
        `CRITICAL: Role '${requestedRoleName}' not found for new user creation.`
      );
      return next(
        new AppError("System configuration error. Cannot register user.", 500)
      );
    }

    // Create the new user document
    user = await User.create({
      phone: phone,
      role_id: newRole._id,
      otp: otp,
      otp_expires: otp_expires,
      // Mongoose .create() automatically handles schema defaults
    });
    await user.populate("role_id");
    console.log(
      `Successfully created new user ${phone} with role ${requestedRoleName}.`
    );
  }

  // **Step 4: Send OTP**
  console.log(`Attempting to send OTP to ${otp} to ${phone}...`); // Don't log OTP value
  const sendResult = await notificationService.sendOtp(phone, otp);

  if (!sendResult.success) {
    console.warn(`Failed to send OTP to ${phone}. Error: ${sendResult.error}`);
    logger.logAction({
      actor_type: "System",
      action_type: "OTP_SEND_FAILED",
      description: `Failed to send OTP to ${phone}. Error: ${sendResult.error}`,
      details: { phone, error: sendResult.error },
    });
  } else {
    logger.logAction({
      actor_type: "System",
      action_type: "OTP_SENT_SUCCESS",
      description: `OTP sent to ${phone}. SID: ${sendResult.messageSid}`,
      details: { phone, messageSid: sendResult.messageSid },
    });
  }

  // **Step 5: Send success response**
  res.status(200).json({
    status: "success",
    message: sendResult.success
      ? "OTP sent successfully."
      : "Processed OTP request. Verification may still be possible.",
  });
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
  const { phone, otp, role } = req.body;

  if (role !== "User") {
    // as a safeguard.
    console.warn(
      `Verify OTP attempt with non-User role: ${role} for phone ${phone}`
    );
    return next(
      new AppError("OTP verification is only for User accounts.", 400)
    );
  }

  const user = await User.findOne({ phone: phone })
    .select("+otp +otp_expires")
    .populate("role_id");

  if (!user || !user.otp || user.otp !== otp) {
    logger.logAction({
      actor_type: "System",
      action_type: "OTP_VERIFY_FAILED_INVALID",
      description: `Invalid OTP for ${phone}.`,
      details: { phone },
    });
    return next(new AppError("Invalid OTP provided", 400));
  }
  if (user.otp_expires < Date.now()) {
    logger.logAction({
      actor_type: "System",
      action_type: "OTP_VERIFY_FAILED_EXPIRED",
      description: `Expired OTP for ${phone}.`,
      details: { phone },
    });
    return next(new AppError("OTP has expired.", 400));
  }

  const actualRoleName = user.role_id?.name;
  if (actualRoleName !== "User") {
    // Should not happen if requestOtp worked correctly, but good safeguard.
    console.error(
      `CRITICAL: User ${user._id} with phone ${phone} verified OTP but has role ${actualRoleName}.`
    );
    logger.logAction({
      actor_type: "System",
      action_type: "OTP_VERIFY_ROLE_MISMATCH_POST_VERIFY",
      description: `User ${phone} verified OTP but has unexpected role ${actualRoleName}.`,
      details: { phone, actualRole: actualRoleName },
    });
    return next(
      new AppError(
        "Account configuration error after verification. Please contact support.",
        500
      )
    );
  }

  user.otp = undefined;
  user.otp_expires = undefined;
  user.otp_verified_at = Date.now();
  user.last_login_at = Date.now();
  user.isVerified = true;
  await user.save({ validateBeforeSave: false });

  const roleName = user.role_id.name;
  const token = jwtHelper.signToken(user._id, roleName);

  const userResponse = {
    id: user._id.toString(),
    phone: user.phone,
    role: roleName,
    isVerified: true,
    isKycSubmitted: !!user.kyc_submitted_at,
    telegramIdLinked: !!user.telegram_id,
    // name, telegram_username, loginId, belongs_to will be included if populated/selected
    // They are not guaranteed here unless explicitly populated in the findOne query
    // Or if User model schema is adjusted to select them by default
  };
  // Manually add potentially selected fields if not selected by default
  if (user.name !== undefined) userResponse.name = user.name;
  if (user.email !== undefined) userResponse.email = user.email;
  if (user.telegram_username !== undefined)
    userResponse.telegram_username = user.telegram_username;
  if (user.telegram_id !== undefined)
    userResponse.telegram_id = user.telegram_id;

  logger.logAction({
    actor_type: "User",
    actor_id: user._id,
    action_type: "OTP_VERIFIED_LOGIN",
    description: `User ${user.phone} logged in successfully.`,
    details: { userId: user._id, phone: user.phone },
  });

  res.status(200).json({
    status: "success",
    token,
    data: { user: userResponse },
  });
});

exports.loginPassword = catchAsync(async (req, res, next) => {
  const { loginId, password } = req.body;

  const user = await User.findOne({ loginId: loginId })
    .select("+password")
    .populate("role_id"); // Populate role_id to get role name

  if (!user || !(await user.correctPassword(password, user.password))) {
    logger.logAction({
      actor_type: "System",
      action_type: "LOGIN_PASSWORD_FAILED_CREDS",
      description: `Failed password login attempt for ID: ${loginId}`,
      details: { loginId },
    });
    return next(new AppError("Incorrect Login ID or password.", 401));
  }

  const actualRoleName = user.role_id?.name;

  if (
    !actualRoleName ||
    actualRoleName === "User") {
    console.log(
      `Password login attempt for ID ${loginId}: requested role is 'User'.`
    );
    logger.logAction({
      actor_type: "System",
      action_type: "LOGIN_PASSWORD_ROLE_MISMATCH",
      description: `Password login attempt for ID ${loginId}: requested role does not match actual role '${actualRoleName}'.`,
      details: {
        loginId,
        requestedRole: requestedRoleName,
        actualRole: actualRoleName,
      },
    });
    // Return the same message as incorrect credentials to avoid leaking info about existence/role
    return next(new AppError("Incorrect Login ID or password.", 401));
  }

  const token = jwtHelper.signToken(user._id, actualRoleName); // Use actualRoleName

  user.last_login_at = Date.now();
  await user.save({ validateBeforeSave: false });

  const userResponse = {
    id: user._id.toString(),
    name: user.name, // Include name
    loginId: user.loginId, // loginId was selected
    role: actualRoleName,
    isVerified: !!user.otp_verified_at, // Should be true for these roles if SA created
    isKycSubmitted: !!user.kyc_submitted_at,
    telegramIdLinked: !!user.telegram_id,
    phone: user.phone || null, // Include phone, might be null
    // Initialize team_members for Admin
    team_members: [],
  };

  // --- START MODIFIED SECTION ---
  // If the logged-in user is an Admin, fetch and add their team members
  if (actualRoleName === "Admin") {
    const teamMembers = await User.find({ belongs_to: user._id })
      .populate("role_id", "name")
      .select("name loginId role_id createdAt"); // Select relevant fields
    userResponse.team_members = teamMembers;
  }
  // --- END MODIFIED SECTION ---

  logger.logAction({
    actor_type: actualRoleName,
    actor_id: user._id,
    action_type: "LOGIN_PASSWORD_SUCCESS",
    description: `${actualRoleName} user '${loginId}' logged in.`,
    details: { userId: user._id, loginId, role: actualRoleName },
  });

  res.status(200).json({
    status: "success",
    token,
    data: { user: userResponse },
  });
});

exports.logout = (req, res) => {
  if (req.user) {
    logger.logAction({
      actor_type: req.user.role_id.name,
      actor_id: req.user._id,
      action_type: "LOGOUT",
      description: `User ${req.user.phone || req.user.loginId} logged out.`,
      details: {
        userId: req.user._id,
        identifier: req.user.phone || req.user.loginId,
        role: req.user.role_id.name,
      },
    });
  }
  // --- MODIFIED: Clear httpOnly cookie if using them ---
  // If using httpOnly cookies for tokens, clear them here.
  // Example: res.cookie('jwt', 'loggedout', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  // --- END MODIFIED ---
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully." });
};
