// utils/otpHelper.js
const crypto = require("crypto");

exports.generateOtp = (length = 6) => {
  // Generate a secure random integer within the desired range
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  return crypto.randomInt(min, max + 1).toString(); // Ensure it has exactly 'length' digits
};

exports.getOtpExpiry = (minutes = 5) => {
  // Returns a Date object representing the expiry time
  return new Date(Date.now() + minutes * 60 * 1000);
};
