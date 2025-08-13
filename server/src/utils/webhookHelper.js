// utils/webhookHelper.js
const crypto = require("crypto");

/**
 * Verifies the Razorpay webhook signature.
 * @param {string|Buffer} rawBody - The raw request body.
 * @param {string} signature - The signature from the 'X-Razorpay-Signature' header.
 * @param {string} secret - The webhook secret configured in Razorpay dashboard.
 * @returns {boolean} - True if the signature is valid, false otherwise.
 */
exports.verifyRazorpaySignature = (rawBody, signature, secret) => {
  if (!rawBody || !signature || !secret) {
    console.error(
      "Webhook verification failed: Missing body, signature, or secret."
    );
    return false;
  }
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody); // Assumes rawBody is buffer or string in correct encoding (usually UTF-8)
    const generatedSignature = hmac.digest("hex");

    // Use timingSafeEqual for security against timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error("Error during webhook signature verification:", error);
    return false;
  }
};

// Add other webhook verification helpers as needed (e.g., for WhatsApp)
// exports.verifyWhatsAppSignature = (...) => { ... };
