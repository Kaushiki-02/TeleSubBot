// utils/jwtHelper.js
const jwt = require("jsonwebtoken");
const AppError = require("./appError");

exports.signToken = (id, roleName) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
    console.error("JWT Secret or Expiry not defined in environment variables!");
    throw new AppError("Internal server configuration error.", 500);
  }
  return jwt.sign({ id, role: roleName }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT Secret not defined in environment variables!");
    throw new AppError("Internal server configuration error.", 500);
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      // Handle invalid signature or malformed token
      throw new AppError("Invalid token. Please log in again.", 401);
    }
    if (error.name === "TokenExpiredError") {
      // Handle expired token
      throw new AppError("Your session has expired. Please log in again.", 401);
    }
    // Handle other potential errors during verification
    console.error("JWT Verification Error:", error);
    throw new AppError("Token verification failed. Please try again.", 500);
  }
};
