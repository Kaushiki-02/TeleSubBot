const User = require("../models/User");
const Role = require("../models/Role");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const { Parser } = require("json2csv");
const mongoose = require("mongoose"); // Added missing require
const Subscription = require("../models/Subscription");
const notificationService = require("../services/notificationService");
const Plan = require("../models/Plan");
// Get own profile (Requires 'User:read:own')
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("role_id", "name").select("+loginId");
  if (!user) return next(new AppError("User not found", 404));

  const userResponse = {
    id: user._id,
    phone: user.phone,
    name: user.name,
    loginId: user.loginId, // Include loginId
    role: user.role_id?.name,
    isVerified: !!user.otp_verified_at,
    isKycSubmitted: !!user.kyc_submitted_at,
    kycSubmittedAt: user.kyc_submitted_at, // Added for consistency
    telegramIdLinked: !!user.telegram_id,
    telegram_username: user.telegram_username,
    createdAt: user.createdAt,
    aadhar_number: user.aadhar_number,
    pan_number: user.pan_number,
    dob: user.date_of_birth,
    team_members: [], // Initialize
  };

  // If the user is an Admin, fetch and add their team members
  if (user.role_id?.name === "Admin") {
    const teamMembers = await User.find({ belongs_to: user._id })
      .populate("role_id", "name")
      .select("name loginId role_id createdAt"); // Select relevant fields for team members
    userResponse.team_members = teamMembers;
  }

  res.status(200).json({ status: "success", data: { user: userResponse } });
});

// Link Telegram ID (Requires 'User:update:own')
exports.linkTelegramusername = catchAsync(async (req, res, next) => {
  const { telegram_username } = req.body;
  const userId = req.user._id;
  if (
    !telegram_username ||
    typeof telegram_username !== "string" ||
    !telegram_username.startsWith("@") ||
    !telegram_username.length > 2
  )
    return next(new AppError("Valid numeric Telegram Username required.", 400));
  const newetele = telegram_username.replace("@", "");

  const existingLink = await User.findOne({
    telegram_username: newetele,
    _id: { $ne: userId },
  });
  if (existingLink)
    return next(
      new AppError(
        "This Telegram account is already linked to another user.",
        409
      )
    );
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { telegram_username: newetele, telegramIdLinked: true },
    { new: true, runValidators: true }
  );
  if (!updatedUser) return next(new AppError("User not found.", 404));
  logger.logAction({
    actor_type: "User",
    actor_id: userId,
    action_type: "TELEGRAM_USERNAME_LINKED",
    target_type: "User",
    target_id: userId,
    description: `User ${updatedUser.phone} linked Telegram Username ${telegram_username}.`,
  });
  res.status(200).json({
    status: "success",
    message: "Telegram Username linked successfully.",
  });
});
exports.updatedDobUser = catchAsync(async (req, res, next) => {
  const { dob } = req.body;
  const userId = req.user._id;

  // Validate if dob is a valid date
  const parsedDate = new Date(dob);
  if (!dob || isNaN(parsedDate.getTime())) {
    return next(new AppError("Valid Date DoB required.", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { date_of_birth: parsedDate },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return next(new AppError("User not found.", 404));
  }

  logger.logAction({
    actor_type: "User",
    actor_id: userId,
    action_type: "UPDATED_DOB",
    target_type: "User",
    target_id: userId,
    description: `User ${updatedUser.phone} updated their Date of Birth.`,
  });

  res.status(200).json({
    status: "success",
    message: "User Birth Date updated successfully.",
  });
});
exports.updatednamemailUser = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const userId = req.user._id;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid email format',
    });
  }


  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { name, email },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return next(new AppError("User not found.", 404));
  }

  logger.logAction({
    actor_type: "User",
    actor_id: userId,
    action_type: "UPDATED_DOB",
    target_type: "User",
    target_id: userId,
    description: `User ${updatedUser.phone} updated their Name and Email.`,
  });

  res.status(200).json({
    status: "success",
    message: "User Name and Email updated successfully.",
    data: { user: updatedUser },
  });
});
// Submit KYC data (Requires 'User:submit:kyc')
exports.submitKyc = catchAsync(async (req, res, next) => {
  const { pan_number, aadhar_number, dob } = req.body;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return next(new AppError("User not found.", 404));

  // Basic format validation (can be enhanced)
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number?.toUpperCase())) {
    return next(new AppError("Invalid PAN format provided.", 400));
  }
  if (!/^\d{12}$/.test(aadhar_number)) {
    return next(
      new AppError("Invalid Aadhar format provided (must be 12 digits).", 400)
    );
  }

  user.pan_number = pan_number.toUpperCase();
  user.aadhar_number = aadhar_number;
  user.date_of_birth = dob;
  user.kyc_submitted_at = Date.now();
  await user.save({ validateModifiedOnly: true });
  logger.logAction({
    actor_type: "User",
    actor_id: userId,
    action_type: "USER_KYC_SUBMITTED",
    target_type: "User",
    target_id: userId,
    description: `User ${user.phone} submitted KYC data.`,
  });
  res.status(200).json({
    status: "success",
    message: "KYC data submitted successfully.",
    data: { kycSubmittedAt: user.kyc_submitted_at },
  });
});

exports.submitKycsub = catchAsync(async (req, res, next) => {
  const { pan_number, aadhar_number, subid, dob } = req.body;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return next(new AppError("User not found.", 404));

  // Basic format validation (can be enhanced)
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number?.toUpperCase())) {
    return next(new AppError("Invalid PAN format provided.", 400));
  }
  if (!/^\d{12}$/.test(aadhar_number)) {
    return next(
      new AppError("Invalid Aadhar format provided (must be 12 digits).", 400)
    );
  }

  user.pan_number = pan_number.toUpperCase();
  user.aadhar_number = aadhar_number;
  user.date_of_birth = dob;
  user.kyc_submitted_at = Date.now();
  await user.save({ validateModifiedOnly: true });

  const sb = await Subscription.findByIdAndUpdate(
    subid,
    { status: "pending" },
    { new: true }
  )
    .populate("link_id")
    .populate("channel_id");

  const savedLink = sb.link_id; // now fully populated document
  const channelName = sb.channel_id.name;

  await notificationService.sendChannelLink(
    user.phone,
    savedLink.url_slug,
    channelName
  );

  logger.logAction({
    actor_type: "User",
    actor_id: userId,
    action_type: "USER_KYC_SUBMITTED",
    target_type: "User",
    target_id: userId,
    description: `User ${user.phone} submitted KYC data.`,
  });
  res.status(200).json({
    status: "success",
    message: "KYC data submitted successfully.",
    data: { kycSubmittedAt: user.kyc_submitted_at },
  });
});
// Get All Users (Requires 'User:read:all')
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  const filter = {};

  if (req.query.role) {
    const roleName = req.query.role;
    const roleDoc = await Role.findOne({
      name: { $regex: `^${roleName}$`, $options: "i" },
    });
    if (roleDoc) {
      filter.role_id = roleDoc._id;
    } else {
      return res
        .status(200)
        .json({ status: "success", results: 0, total: 0, data: { users: [] } });
    }
  }
  // If SA is filtering by 'belongs_to' (an Admin's ID)
  if (req.query.belongs_to && currentUser.role_id.name === "SuperAdmin") {
    if (mongoose.Types.ObjectId.isValid(req.query.belongs_to)) {
      filter.belongs_to = req.query.belongs_to;
    } else {
      return next(new AppError("Invalid belongs_to ID format.", 400));
    }
  }

  let baseQuery;
  let populationFields = [{ path: "role_id", select: "name" }];

  if (currentUser.role_id.name === "Admin") {
    // Admin sees verified users in their channels + their own team members.
    // For now, keep it simple: Admin's user list is their channel users.
    filter.channels = { $in: currentUser.channels };
    filter.otp_verified_at = { $ne: null }; // Typically for 'User' role
    // If Admin requests their own team via this endpoint (e.g. ?belongs_to=my_id)
    if (
      req.query.belongs_to &&
      req.query.belongs_to === currentUser._id.toString()
    ) {
      delete filter.channels; // Don't filter by channels if specifically asking for team
      filter.belongs_to = currentUser._id;
      populationFields.push({ path: "belongs_to", select: "name loginId" });
    }

    baseQuery = User.find(filter);
  } else if (currentUser.role_id.name === "SuperAdmin") {
    // SuperAdmin can see all users. Filter object may already contain role_id or belongs_to.
    if (filter.belongs_to) {
      // If filtering by belongs_to, populate its details
      populationFields.push({ path: "belongs_to", select: "name loginId" });
    }
    baseQuery = User.find(filter).select("+loginId");
  } else {
    return next(new AppError("Access denied to view user list.", 403));
  }

  baseQuery = baseQuery.populate(populationFields);
  const users = await baseQuery;
  const totalCount = users.length

  res.status(200).json({
    status: "success",
    results: users.length,
    total: totalCount,
    data: { users },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  const userIdToView = req.params.id;

  let query = User.findById(userIdToView).populate("role_id", "name");

  if (currentUser.role_id.name === "Admin") {
    // Admin can only view users in their channels OR their own team members
    const targetUser = await User.findById(userIdToView).select("+belongs_to");
    if (
      targetUser &&
      targetUser.belongs_to &&
      targetUser.belongs_to.equals(currentUser._id)
    ) {
      // Admin is viewing their own team member
    } else {
      // Admin is viewing a channel user (existing logic)
      query = query.where("channels").in(currentUser.channels);
    }
  }

  let user = await query;

  if (!user) return next(new AppError("User not found or access denied", 404));

  const userResponse = user.toObject(); // Convert to plain object to modify

  // If SuperAdmin is viewing an Admin, populate their team members
  if (
    currentUser.role_id.name === "SuperAdmin" &&
    user.role_id.name === "Admin"
  ) {
    const teamMembers = await User.find({ belongs_to: user._id })
      .populate("role_id", "name")
      .select("name loginId role_id createdAt"); // Select relevant fields
    userResponse.team_members = teamMembers;
  }
  // If Admin is viewing their own profile (via a generic /users/:id route, though /me is typical)
  else if (
    currentUser.role_id.name === "Admin" &&
    user._id.equals(currentUser._id)
  ) {
    const teamMembers = await User.find({ belongs_to: currentUser._id })
      .populate("role_id", "name")
      .select("name loginId role_id createdAt");
    userResponse.team_members = teamMembers;
  }

  res.status(200).json({ status: "success", data: { user: userResponse } });
});

exports.createRoleUser = catchAsync(async (req, res, next) => {
  const { loginId, password, name, roleName, belongs_to } = req.body; // Added roleName, belongs_to

  if (!loginId || !password || !name || !roleName) {
    return next(
      new AppError("Login ID, password, name, and roleName are required.", 400)
    );
  }

  const allowedRoles = ["Admin", "Support", "Sales"];
  if (!allowedRoles.includes(roleName)) {
    return next(
      new AppError(
        `Invalid roleName. Must be one of: ${allowedRoles.join(", ")}.`,
        400
      )
    );
  }

  const role = await Role.findOne({ name: roleName });
  if (!role) {
    return next(
      new AppError(
        `Role '${roleName}' not found. System configuration error.`,
        500
      )
    );
  }

  if ((roleName === "Support" || roleName === "Sales") && !belongs_to) {
    return next(
      new AppError(
        `For ${roleName} role, 'belongs_to' (Admin ID) is required.`,
        400
      )
    );
  }
  if (roleName === "Admin" && belongs_to) {
    // Ensure Admins don't have belongs_to set through this specific creation endpoint
    return next(
      new AppError("Admin role cannot have a 'belongs_to' assignment.", 400)
    );
  }

  // Check if a user with this loginId already exists
  const existingUser = await User.findOne({ loginId: loginId });
  if (existingUser) {
    return next(
      new AppError(`User with Login ID ${loginId} already exists.`, 409)
    );
  }

  const newUserPayload = {
    loginId,
    password,
    name,
    role_id: role._id,
    otp_verified_at: new Date(),
  };

  if (belongs_to && (roleName === "Support" || roleName === "Sales")) {
    newUserPayload.belongs_to = belongs_to;
  }

  const newUser = await User.create(newUserPayload);

  // Populate the role for the response
  await newUser.populate({ path: "role_id", select: "name" });
  if (newUser.belongs_to) {
    await newUser.populate({ path: "belongs_to", select: "name loginId" });
  }

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: `${roleName.toUpperCase()}_USER_CREATED`,
    target_type: "User",
    target_id: newUser._id,
    description: `${req.user.role_id.name} created new ${roleName} user '${name}' (Login ID: ${loginId}).`,
  });

  // Exclude password from response if it was somehow selected
  const userResponse = newUser.toObject();
  delete userResponse.password;

  res.status(201).json({
    status: "success",
    message: `${roleName} user '${name}' created successfully.`,
    data: { user: userResponse },
  });
});

exports.updateRoleUser = catchAsync(async (req, res, next) => {
  const { loginId, password } = req.body;
  if (req.user.role_id.name !== "SuperAdmin") {
    return next(new AppError("Access denied", 404));

  }
  if (!loginId || !password) {
    return next(new AppError("Login ID and password are required.", 400));
  }

  // Attempt to update the user
  const result = await User.updateOne({ loginId }, { password });

  if (result.matchedCount === 0) {
    return next(
      new AppError(`User with Login ID ${loginId} doesn't exist.`, 409)
    );
  }

  // Retrieve user for logging purposes (if needed)
  const updatedUser = await User.findOne({ loginId });

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: `${loginId}_USER_UPDATED`,
    target_type: "User",
    target_id: updatedUser?._id ?? "unknown", // failsafe
    description: `${req.user.role_id.name} updated (Login ID: ${loginId}).`,
  });

  res.status(200).json({
    status: "success",
    message: `${loginId} updated successfully.`,
  });
});

exports.updateUserRoleAssignment = catchAsync(async (req, res, next) => {
  const { role_id } = req.body;
  const userIdToUpdate = req.params.id;
  if (!role_id)
    return next(new AppError("Role ID is required in the request body.", 400));
  if (!mongoose.Types.ObjectId.isValid(role_id)) {
    return next(new AppError("Invalid Role ID format provided.", 400));
  }

  const roleToAssign = await Role.findById(role_id);
  if (!roleToAssign)
    return next(new AppError("Role specified not found.", 404));
  if (roleToAssign.name === "SuperAdmin")
    return next(
      new AppError("Cannot programmatically assign SuperAdmin role.", 403)
    );

  const user = await User.findById(userIdToUpdate).populate("role_id");
  if (!user) return next(new AppError("User to update not found.", 404));
  if (user._id.equals(req.user._id))
    return next(new AppError("Cannot change your own role.", 403));
  if (user.role_id?.name === "SuperAdmin")
    return next(new AppError("Cannot change the role of a SuperAdmin.", 403));

  const oldRoleName = user.role_id?.name || "None";
  user.role_id = roleToAssign._id;
  await user.save({ validateModifiedOnly: true });
  await user.populate("role_id", "name"); // Re-populate for response

  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "USER_ROLE_ASSIGNED",
    target_type: "User",
    target_id: userIdToUpdate,
    description: `Role for user ${user.phone} changed from ${oldRoleName} to ${roleToAssign.name}.`,
  });
  res.status(200).json({ status: "success", data: { user } });
});

// Export Users (Requires 'User:export')
exports.exportUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ otp_verified_at: { $ne: null } })
    .populate("role_id", "name")
    .lean();
  if (!users?.length)
    return next(new AppError("No verified users found to export.", 404));

  const fields = [
    { label: "User ID", value: "_id" },
    { label: "Phone", value: "phone" },
    { label: "D.O.B", value: "date_of_birth" },
    { label: "Role", value: "role_id.name" },
    { label: "OTP Verified At", value: "otp_verified_at" },
    { label: "Last Login At", value: "last_login_at" },
    { label: "KYC Submitted At", value: "kyc_submitted_at" },
    { label: "PAN Number", value: "pan_number" },
    { label: "Aadhar Number", value: "aadhar_number" },
    { label: "Telegram ID", value: "telegram_id" },
    { label: "Created At", value: "createdAt" },
  ];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(users);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=crm_users.csv");
  res.status(200).send(csv);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "USER_DATA_EXPORTED",
    description: `User data exported.`,
  });
});
