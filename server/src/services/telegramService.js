// services/telegramService.js
const TelegramBot = require("node-telegram-bot-api");
const logger = require("../utils/logger");

let bot;
const token = process.env.TELEGRAM_BOT_TOKEN;

if (token && token !== "your_telegram_bot_token" && !token.includes("replace_your_token")) {
  // More specific check
  try {
    // Consider disabling polling if using webhooks primarily
    bot = new TelegramBot(token, { polling: false });
    console.log("Telegram Bot instance initialized.");
    // You might want to test the connection
    // bot.getMe().then(info => console.log(`Connected to Telegram Bot: ${info.username}`)).catch(err => console.error('Telegram connection test failed:', err));
  } catch (error) {
    console.error("Failed to initialize Telegram Bot:", error.message);
    bot = null;
  }
} else {
  console.warn(
    "TELEGRAM_BOT_TOKEN not set or is a placeholder. Telegram actions will be simulated."
  );
  bot = null;
}

const isSimulation = !bot;

/**
 * Kicks a user from a Telegram channel/supergroup.
 * @param {number} telegramUserId - The numeric Telegram User ID.
 * @param {string|number} channelChatId - The chat ID (numeric) or username (@channelname) of the channel.
 * @returns {Promise<{success: boolean, simulated: boolean, error?: string}>}
 */
exports.removeUserFromChannel = async (telegramUserId, channelChatId) => {
  if (isSimulation) {
    console.warn(
      `SIMULATING TG REMOVAL: User ${telegramUserId} from ${channelChatId}.`
    );
    logger.logAction({
      actor_type: "System",
      action_type: "TELEGRAM_REMOVE_USER_SIMULATED",
      description: `Simulated removal of TG User ID ${telegramUserId} from channel ${channelChatId}.`,
    });
    return { success: true, simulated: true };
  }
  if (!telegramUserId || !channelChatId) {
    return {
      success: false,
      error: "Missing Telegram User ID or Channel Chat ID",
      simulated: false,
    };
  }

  try {
    console.log(
      `Attempting Telegram kickChatMember: User ${telegramUserId} from ${channelChatId}`
    );
    // Use kickChatMember - this also prevents them from rejoining immediately unless unbanned.
    const result = await bot.kickChatMember(channelChatId, telegramUserId);

    if (result === true) {
      logger.logAction({
        actor_type: "System",
        action_type: "TELEGRAM_REMOVE_USER_SUCCESS",
        description: `Removed TG User ID ${telegramUserId} from channel ${channelChatId}.`,
      });
      return { success: true, simulated: false };
    } else {
      // Should not happen often, API usually throws error or returns true
      logger.logAction({
        actor_type: "System",
        action_type: "TELEGRAM_REMOVE_USER_FAILED_UNEXPECTED",
        description: `TG API returned non-true result removing TG User ID ${telegramUserId} from channel ${channelChatId}. Result: ${result}`,
      });
      return {
        success: false,
        error: "Telegram API returned an unexpected non-true result",
        simulated: false,
      };
    }
  } catch (error) {
    console.error(
      `Error removing user ${telegramUserId} from channel ${channelChatId}:`,
      error.response ? error.response.body : error.message
    );
    const errorMessage = error.response?.body?.description || error.message;
    const errorCode = error.code || error.response?.body?.error_code;
    logger.logAction({
      actor_type: "System",
      action_type: "TELEGRAM_REMOVE_USER_ERROR",
      description: `Error removing TG User ID ${telegramUserId} from channel ${channelChatId}: ${errorMessage}`,
      details: { code: errorCode, telegramUserId, channelChatId },
    });
    // Specific error handling (e.g., user not found in chat might not be a critical failure)
    if (
      errorMessage.includes("user not found") ||
      errorMessage.includes("member is administrator")
    ) {
      console.warn(
        `Telegram removal for user ${telegramUserId} in ${channelChatId} skipped: ${errorMessage}`
      );
      return { success: true, simulated: false }; // Treat as success if user already gone/admin
    }
    return { success: false, error: errorMessage, simulated: false };
  }
};

/**
 * Creates a one-time invite link for a channel.
 * @param {string|number} channelChatId - The chat ID (numeric) or username (@channelname) of the channel.
 * @param {Date} [expireDate] - Optional expiry date for the link.
 * @param {number} [memberLimit=1] - Maximum members allowed (default 1).
 * @returns {Promise<{success: boolean, link?: string, simulated: boolean, error?: string}>}
 */
exports.createChannelInviteLink = async (
  channelChatId,
  expireDate,
  memberLimit = 1
) => {
  if (isSimulation) {
    console.warn(`SIMULATING TG INVITE LINK: For channel ${channelChatId}.`);
    logger.logAction({
      actor_type: "System",
      action_type: "TELEGRAM_INVITE_LINK_SIMULATED",
      description: `Simulated invite link for ${channelChatId}.`,
    });
    return {
      success: true,
      link: `https://t.me/joinchat/SIMULATED_${Date.now()}`,
      simulated: true,
    };
  }
  if (!channelChatId)
    return {
      success: false,
      error: "Channel Chat ID required",
      simulated: false,
    };

  try {
    const options = { member_limit: memberLimit };
    // Convert Date object to Unix timestamp (seconds) if provided
    if (expireDate instanceof Date) {
      options.expire_date = Math.floor(expireDate.getTime() / 1000);
    }
    const inviteLink = await bot.createChatInviteLink(channelChatId, options);
    logger.logAction({
      actor_type: "System",
      action_type: "TELEGRAM_INVITE_LINK_CREATED",
      description: `Created TG invite link for ${channelChatId}.`,
    });
    return { success: true, link: inviteLink.invite_link, simulated: false };
  } catch (error) {
    console.error(
      `Error creating invite link for ${channelChatId}:`,
      error.response ? error.response.body : error.message
    );
    const errorMessage = error.response?.body?.description || error.message;
    const errorCode = error.code || error.response?.body?.error_code;
    logger.logAction({
      actor_type: "System",
      action_type: "TELEGRAM_INVITE_LINK_ERROR",
      description: `Error creating invite link for ${channelChatId}: ${errorMessage}`,
      details: { code: errorCode, channelChatId, options },
    });
    return { success: false, error: errorMessage, simulated: false };
  }
};

// Optional: Add function to unban user if needed after kick (kickChatMember usually suffices)
/**
 * Unbans a previously kicked user from a channel.
 * @param {number} telegramUserId
 * @param {string|number} channelChatId
 * @returns {Promise<{success: boolean, simulated: boolean, error?: string}>}
 */
// exports.unbanUserFromChannel = async (telegramUserId, channelChatId) => {
//     if (isSimulation) {
//         console.warn(`SIMULATING TG UNBAN: User ${telegramUserId} from ${channelChatId}.`);
//         return { success: true, simulated: true };
//     }
//     if (!telegramUserId || !channelChatId) {
//         return { success: false, error: "Missing IDs", simulated: false };
//     }
//     try {
//         const result = await bot.unbanChatMember(channelChatId, telegramUserId, { only_if_banned: true });
//         logger.logAction({ actor_type: 'System', action_type: 'TELEGRAM_UNBAN_USER_SUCCESS', description: `Unbanned TG:${telegramUserId} from ${channelChatId}.` });
//         return { success: result, simulated: false };
//     } catch (error) {
//         const errorMessage = error.response?.body?.description || error.message;
//         logger.logAction({ actor_type: 'System', action_type: 'TELEGRAM_UNBAN_USER_ERROR', description: `Error unbanning TG:${telegramUserId} from ${channelChatId}: ${errorMessage}` });
//         return { success: false, error: errorMessage, simulated: false };
//     }
// };
