// services/notificationService.js
const logger = require("../utils/logger");
// const twilio = require('twilio'); // Uncomment if using Twilio
const axios = require("axios");
let whatsAppClient = "https://backend.aisensy.com/campaign/t1/api/v2";

const isSimulation = process.env.NODE_ENV === "development";

exports.sendOtp = async (phone, otp) => {
  const recipient = `whatsapp:${phone}`;
  const sotp = String(otp);

  if (isSimulation) {
    console.log(`--- SIMULATING WHATSAPP OTP --- To: ${phone}, OTP: ${sotp}`);
    logger.logAction({
      actor_type: "System",
      action_type: "OTP_SENT_SIMULATED",
      description: `Simulated OTP to ${phone}.`,
    });
    return { success: true, messageSid: `simulated_otp_${Date.now()}` };
  }

  try {
    const response = await axios.post(whatsAppClient, {
      apiKey: process.env.WHATSAPP_PROVIDER_API_KEY,
      campaignName: "wa-tele app",
      destination: "91" + phone,
      userName: "John Doe", // Optional: pass dynamically if available
      templateParams: [sotp],
      buttons: [
        {
          type: "button",
          sub_type: "url",
          index: 0,
          parameters: [
            {
              type: "text",
              text: sotp,
            },
          ],
        },
      ],
    });

    const messageSid = response?.data?.messageId || `real_otp_${Date.now()}`;
    console.log(`--- SENT WHATSAPP OTP --- To: ${recipient}, OTP: ${otp}.`);

    logger.logAction({
      actor_type: "System",
      action_type: "OTP_SENT_ATTEMPTED",
      description: `Sent OTP to ${phone}. SID: ${messageSid}`,
    });

    return { success: true, messageSid: messageSid };
  } catch (error) {
    console.error(`Error sending WhatsApp OTP to ${phone}:`, error.message);
    logger.logAction({
      actor_type: "System",
      action_type: "OTP_SENT_FAILED",
      description: `Failed OTP send attempt to ${phone}. Error: ${error.message}`,
      details: { code: error.code },
    });
    return { success: false, error: error.message };
  }
};

exports.sendReminder = async (phone, messageBody, days) => {
  const recipient = `whatsapp:${phone}`;

  if (isSimulation) {
    console.log(
      `--- SIMULATING WHATSAPP REMINDER --- To: ${phone}, Message: ${messageBody}`
    );
    return { success: true, messageSid: `simulated_reminder_${Date.now()}` };
  }

  try {
    const response = await axios.post(whatsAppClient, {
      apiKey: process.env.WHATSAPP_PROVIDER_API_KEY,
      destination: "91" + phone,
      campaignName: "wa-tele alert",
      userName: "John Doe",
      templateParams: [
        days,
        "http://15.206.88.151/login"
      ]
    });

    const messageSid = response?.data?.messageId || `real_otp_${Date.now()}`;

    console.log(
      `--- WOULD SEND REAL WHATSAPP REMINDER --- To: ${recipient}, Body: ${messageBody}. Template: YOUR_REMINDER_TEMPLATE_SID`
    );
    // Don't log full message body here in production if it contains sensitive info
    logger.logAction({
      actor_type: "System",
      action_type: "REMINDER_SENT_ATTEMPTED",
      description: `Attempted reminder send to ${phone}. SID: ${messageSid}`,
    });
    return { success: true, messageSid: messageSid }; // Assume success on API call initiation
  } catch (error) {
    console.error(`Error sending WhatsApp Reminder to ${phone}:`, error);
    logger.logAction({
      actor_type: "System",
      action_type: "REMINDER_SENT_FAILED",
      description: `Failed reminder send attempt to ${phone}. Error: ${error.message}`,
      details: { code: error.code },
    });
    return { success: false, error: error.message };
  }
};

exports.sendChannelLink = async (phone, link, channelName) => {
  const recipient = `whatsapp:${phone}`;

  if (isSimulation) {
    console.log(
      `--- SIMULATING WHATSAPP Channel Link --- To: ${phone}, LINK: ${link}`
    );
    // In simulation, log success immediately
    logger.logAction({
      actor_type: "System",
      action_type: "ChannelLink_SENT_SIMULATED",
      description: `Simulated ChannelLink to ${phone}.`,
    });
    return { success: true, messageSid: `simulated_ChannelLink_${Date.now()}` };
  }

  try {
    const response = await axios.post(whatsAppClient, {
      apiKey: process.env.WHATSAPP_PROVIDER_API_KEY,
      campaignName: "Telegram Link",
      destination: "91" + phone,
      userName: "John Doe",
      templateParams: [
        "User",
        channelName,
        link
      ],
      source: "new-landing-page form",
      media: {},
      buttons: [],
      carouselCards: [],
      location: {},
      attributes: {}

    });

    const messageSid = response?.data?.messageId || `real_otp_${Date.now()}`;
    console.log(
      `--- WOULD SEND REAL WHATSAPP ChannelLink --- To: ${recipient},${channelName} ChannelLink: ${link}. Template: Telegram Channel Link`
    );
    logger.logAction({
      actor_type: "System",
      action_type: "ChannelLink_SENT_ATTEMPTED",
      description: `Attempted ChannelLink send to ${phone}. SID: ${messageSid}`,
    }); // Log attempt
    return { success: true, messageSid: messageSid }; // Assume success on API call initiation
  } catch (error) {
    console.error(
      `Error sending WhatsApp ChannelLink to ${phone}:`,
      error.message
    );
    logger.logAction({
      actor_type: "System",
      action_type: "ChannelLink_SENT_FAILED",
      description: `Failed ChannelLink send attempt to ${phone}. Error: ${error.message}`,
      details: { code: error.code },
    });
    return { success: false, error: error.message };
  }
};
