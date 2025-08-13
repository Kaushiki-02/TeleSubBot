const express = require("express");
const transactionController = require("../controllers/transactionController");
const reminderController = require("../controllers/reminderController");
const telegramController = require("../controllers/telegramController");
const router = express.Router();

// IMPORTANT: These routes should NOT use global body parsers if raw body is needed for signature verification.
// Apply specific body parsing middleware here if necessary, OR configure server.js carefully.
// Example: app.use('/api/v1/webhooks/razorpay', express.raw({type: 'application/json'}), webhookRoutes);

// Razorpay Webhook
router.post("/razorpay", transactionController.handleRazorpayWebhook);

// WhatsApp Status Webhook
router.post("/whatsapp/status", reminderController.handleWhatsAppStatusWebhook);
// router.get('/whatsapp/status', (req, res) => { /* Handle verification challenge if needed */ }); // For webhook setup verification

router.post("/telegram", telegramController.handleTelegramWebhook);

module.exports = router;
