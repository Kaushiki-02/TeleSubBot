const axios = require("axios");

require("dotenv").config({ path: "./config.env" });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL =
  "https://hook.eu2.make.com/yj0f8eeeq1trobdghujsnkisg083ea2j";

const setWebhook = async () => {
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        url: WEBHOOK_URL,
      }
    );
    console.log("Webhook set successfully:", response.data);
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
};

setWebhook();
