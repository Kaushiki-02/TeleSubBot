const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");
const catchAsync = require("../utils/catchAsync");
const jwtHelper = require("../utils/jwtHelper");
const AppError = require("../utils/appError"); // Import AppError

// Protect routes middleware
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) Getting token and check if it exists
  // Check header first
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Then check cookie (if using httpOnly cookies)
  // else if (req.cookies && req.cookies.jwt) {
  //   token = req.cookies.jwt;
  // }

  if (!token)
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );

  // 2) Verification token
  let decoded;
  try {
    decoded = jwtHelper.verifyToken(token);
    // verifyToken utility throws AppError on failure
  } catch (error) {
    // jwtHelper.verifyToken should throw specific AppErrors (401)
    return next(error);
  }

  // 3) Check if user still exists
  // Populate role and its permissions
  const currentUser = await User.findById(decoded.id).populate([
    {
      path: "role_id",
      select: "name",
      populate: { path: "permissions" }, // Populate permissions within the role
    },
  ]);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );
  }

  // 5) Check if OTP is verified for routes that require it (Only applies to User role)
  // If the user is a 'User' role AND OTP is not verified AND not on allowed routes...
  const isUserRole = currentUser.role_id?.name === "User";
  const allowedPreOtpRoutes = [
    "/users/me",
    "/users/kyc",
    "/auth/logout",
    "/users/me/telegram",
  ]; // Routes accessible before OTP verification

  if (
    isUserRole &&
    !currentUser.otp_verified_at &&
    !allowedPreOtpRoutes.some((route) => req.originalUrl.includes(route)) &&
    // Ensure the verification route itself is allowed
    !req.originalUrl.includes("/auth/otp/verify")
  ) {
    return next(
      new AppError("OTP verification required to access this route.", 403)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// New RBAC Middleware: Checks if user has AT LEAST ONE of the required permissions
exports.authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user?.role_id?.permissions) {
      return next(
        new AppError(
          "Permission denied: User role or permissions not loaded.",
          500
        )
      );
    }

    const userPermissions = new Set(
      req.user.role_id.permissions.map((p) => `${p.resource}:${p.action}`)
    );

    const hasPermission = requiredPermissions.some((key) =>
      userPermissions.has(key)
    );

    if (!hasPermission) {
      console.warn(
        `Permission denied for role '${req.user.role_id.name}' on route ${
          req.originalUrl
        }. Needs one of: [${requiredPermissions.join(", ")}]`
      );
      return next(
        new AppError(
          `Permission denied. You do not have the necessary permissions to perform this action.`,
          403
        )
      );
    }

    next();
  };
};
