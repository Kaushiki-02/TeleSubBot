// services/paymentService.js
const Razorpay = require("razorpay");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

let razorpayInstance;
try {
  const keyId =
    process.env.NODE_ENV === "prod" ? process.env.RAZORPAY_KEY_ID_PROD : process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.NODE_ENV === "prod" ? process.env.RAZORPAY_KEY_SECRET_PROD : process.env.RAZORPAY_KEY_SECRET;
  if (
    !keyId ||
    !keySecret ||
    keyId.includes("xxxx") ||
    keySecret.includes("replace")
  ) {
    console.warn(
      "Razorpay keys missing or are placeholders in .env. Payment service functionality will be disabled."
    );
    razorpayInstance = null;
  } else {
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    console.log("Razorpay instance initialized.");
  }
} catch (error) {
  console.error("Failed to initialize Razorpay instance:", error);
  razorpayInstance = null;
}

exports.createRazorpayOrder = async (amount, currency = "INR", receiptId, notes) => {
  if (!razorpayInstance) {
    // Log the attempt even if service is disabled
    logger.logAction({
      actor_type: "System",
      action_type: "RAZORPAY_ORDER_CREATE_SKIPPED",
      description: `Razorpay service disabled. Order creation skipped for receipt: ${receiptId}`,
    });
    throw new AppError(
      "Payment service is currently unavailable. Please try again later.",
      503
    );
  }

  // Razorpay expects amount in smallest currency unit (paise for INR)
  const amountInPaise = Math.round(amount * 100);
  if (amountInPaise <= 0) {
    throw new AppError("Invalid order amount. Amount must be positive.", 400);
  }

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: receiptId,
    payment_capture: 1, // Auto capture payment
    notes
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    console.log(
      `RZP Order Created: ${order.id} for amount ${amount} ${currency}`
    );
    return order;
  } catch (error) {
    console.error(
      `Razorpay order creation failed for receipt ${receiptId}:`,
      error
    );
    logger.logAction({
      actor_type: "System",
      action_type: "RAZORPAY_ORDER_CREATE_FAILED",
      description: `Failed RZP order. Receipt: ${receiptId}`,
      details: {
        error: error?.error?.description || error.message,
        code: error?.code || error?.statusCode,
      },
    });
    // Provide a clearer error message to the client
    throw new AppError(
      `Could not create payment order: ${error?.error?.description || "Payment gateway error"
      }`,
      500
    );
  }
};

exports.fetchRazorpayInvoice = async (paymentId) => {
  if (!razorpayInstance) {
    console.warn("fetchRazorpayInvoice skipped: Razorpay service disabled.");
    return null;
  }
  if (!paymentId) {
    console.warn("fetchRazorpayInvoice skipped: No payment ID provided.");
    return null;
  }

  try {
    // Fetch payment details first to get the invoice_id if it exists
    const payment = await razorpayInstance.payments.fetch(paymentId);
    if (payment.invoice_id) {
      const invoice = await razorpayInstance.invoices.fetch(payment.invoice_id);
      console.log(
        `Fetched RZP invoice ${invoice.id} (URL: ${invoice.short_url}) for payment ${paymentId}`
      );
      return invoice; // Contains { id, status, short_url, ... }
    } else {
      console.log(`No invoice ID found associated with payment ${paymentId}.`);
      return null;
    }
  } catch (error) {
    // Log error but don't crash the main flow if invoice fetch fails
    console.error(
      `Error fetching RZP invoice details for payment ${paymentId}:`,
      error
    );
    logger.logAction({
      actor_type: "System",
      action_type: "RAZORPAY_INVOICE_FETCH_FAILED",
      description: `Failed RZP invoice fetch for payment ${paymentId}`,
      details: { error: error.message, code: error?.code || error?.statusCode },
    });
    return null; // Return null instead of throwing an error from a fetch utility
  }
};

exports.fetchRazorpayPayouts = async ({ fromDate, toDate }) => {
  if (!razorpayInstance) {
    console.warn("fetchRazorpayPayouts skipped: Razorpay service disabled.");
    return [];
  }
  try {
    console.warn(
      "fetchRazorpayPayouts: Needs implementation using Razorpay Settlements or Payouts API. Returning empty array."
    );
    // Example structure (adjust based on actual API response from settlements or payouts)
    // const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    // const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    // const settlements = await razorpayInstance.settlements.all({ from: fromTimestamp, to: toTimestamp, count: 100 });
    // return settlements.items;
    // OR
    // const payouts = await razorpayInstance.payouts.all({ from: fromTimestamp, to: toTimestamp, count: 100 });
    // return payouts.items;
    return []; // Placeholder
  } catch (error) {
    console.error(`Error fetching RZP payouts/settlements:`, error);
    logger.logAction({
      actor_type: "System",
      action_type: "RAZORPAY_PAYOUT_FETCH_FAILED",
      description: `Failed RZP payout/settlement fetch.`,
      details: { error: error.message, code: error?.code || error?.statusCode },
    });
    throw new AppError(
      "Failed to fetch payout data from payment gateway.",
      500
    );
  }
};
