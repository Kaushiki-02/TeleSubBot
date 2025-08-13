const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const { sendReminder } = require("../services/notificationService");
const telegramService = require("../services/telegramService");
const logger = require("../utils/logger");

const runSubscriptionJobs = async () => {
  console.log("Scheduling subscription expiry and reminder jobs...");

  // --- Job 1: Handle Expired Subscriptions ---
  cron.schedule(
    process.env.SUBSCRIPTION_JOB_SCHEDULE || "0 * * * *",
    async () => {
      console.log("Running expired subscription check job at", new Date());
      const now = new Date();
      try {
        const expiredSubs = await Subscription.find({
          status: "active",
          end_date: { $lt: now },
        })
          .populate("user_id", "phone name")
          .populate("channel_id", "telegram_chat_id name");

        if (expiredSubs.length === 0) {
          console.log("No active subscriptions found that have expired.");
          return;
        }

        console.log(
          `Found ${expiredSubs.length} subscriptions to mark as expired.`
        );

        for (const sub of expiredSubs) {
          sub.status = "expired";
          await sub.save();

          logger.logAction({
            actor_type: "System",
            action_type: "SUBSCRIPTION_EXPIRED",
            target_type: "Subscription",
            target_id: sub._id,
            description: `Subscription for user ${sub.user_id?.phone || sub.user_id?._id
              } in channel ${sub.channel_id?.name || sub.channel_id?._id
              } automatically marked as expired.`,
            details: {
              userId: sub.user_id?._id,
              channelId: sub.channel_id?._id,
              endDate: sub.end_date,
            },
          });

          const telegramUserId = sub.telegramUser_id;
          const channelChatId = sub.channel_id?.telegram_chat_id;

          if (telegramUserId && channelChatId) {
            console.log(
              `Attempting Telegram removal for expired sub ${sub._id}: User ${telegramUserId} from ${channelChatId}`
            );
            // MODIFIED: Call using the imported namespace
            const removalResult = await telegramService.removeUserFromChannel(
              telegramUserId,
              channelChatId
            );
            if (!removalResult.success && !removalResult.simulated) {
              console.error(
                `Failed to remove user ${telegramUserId} from Telegram channel ${channelChatId} after expiry. Error: ${removalResult.error}`
              );
              logger.logAction({
                actor_type: "System",
                action_type: "TELEGRAM_REMOVE_USER_ON_EXPIRY_FAILED",
                target_type: "Subscription",
                target_id: sub._id,
                description: `Failed Telegram removal for user ${sub.user_id?.phone} from channel ${sub.channel_id?.name} on expiry. Error: ${removalResult.error}`,
                details: {
                  userId: sub.user_id?._id,
                  channelId: sub.channel_id?._id,
                  telegramUserId,
                  channelChatId,
                },
              });
            }
          } else {
            console.warn(
              `Could not trigger Telegram removal for expired sub ${sub._id
              }: Missing Telegram User ID (${!!telegramUserId}) or Channel Chat ID (${!!channelChatId}).`
            );
            logger.logAction({
              actor_type: "System",
              action_type: "TELEGRAM_REMOVE_USER_ON_EXPIRY_SKIPPED",
              target_type: "Subscription",
              target_id: sub._id,
              description: `Skipped Telegram removal for user ${sub.user_id?.phone || sub.user_id?._id
                } from channel ${sub.channel_id?.name || sub.channel_id?._id
                } on expiry due to missing IDs.`,
              details: {
                userId: sub.user_id?._id,
                channelId: sub.channel_id?._id,
              },
            });
          }
          console.log(`Processed expiry for subscription ${sub._id}`);
        }
        console.log("Finished processing expired subscriptions.");
      } catch (error) {
        console.error("Error running expired subscription job:", error);
        logger.logAction({
          actor_type: "System",
          action_type: "JOB_ERROR_EXPIRY_CHECK",
          description: `Error during expired subscription check: ${error.message}`,
          details: { error: error.stack },
        });
      }
    },
    {
      timezone: "Asia/Kolkata"
    }
  );



  // --- Job 2: Send Pre-Expiry Reminders ---
  cron.schedule(process.env.REMINDER_JOB_SCHEDULE || "0 9 * * *", async () => {
    console.log("Running pre-expiry reminder job at", new Date());
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      const activesubs = await Subscription.find({ status: "active" })
        .populate("user_id", "phone name")
        .populate("channel_id", "telegram_chat_id name reminder_days_override");

      const filteredSubs = activesubs.filter((sub) => {
        const reminderDays = sub.channel_id?.reminder_days_override;
        const endDate = new Date(sub.end_date);
        endDate.setHours(0, 0, 0, 0); // Normalize

        if (typeof reminderDays !== "number") return false;

        const reminderDate = new Date(endDate);
        reminderDate.setDate(reminderDate.getDate() - reminderDays);

        return reminderDate.getTime() === today.getTime();
      });

      if (filteredSubs.length === 0) {
        console.log("No active subscriptions found that have alert.");
        return;
      }

      console.log(
        `Found ${filteredSubs.length} subscriptions to mark as alert.`
      );

      for (const sub of filteredSubs) {

        if (!sub.user_id?.phone) {
          console.warn(
            `Skipping reminder for sub ${sub._id}: User phone number not found.`
          );
          logger.logAction({
            actor_type: "System",
            action_type: "REMINDER_SKIPPED_NO_PHONE",
            target_type: "Subscription",
            target_id: sub._id,
            description: `Skipped '${template.name}' reminder due to missing phone.`,
          });
          continue;
        }

        console.log(
          `Sending reminder to ${sub.user_id.phone} for sub ${sub._id}`
        );
        const sendResult = await sendReminder(sub.user_id.phone, `Reminder: Your subscription for ${sub.channel_id?.name} expires in ${sub.channel_id?.reminder_days_override} day(s).`
          , sub.channel_id?.reminder_days_override);

        logger.logAction({
          actor_type: "System",
          action_type: sendResult.success
            ? "REMINDER_SENT_SUCCESS"
            : "REMINDER_SENT_FAILED",
          target_type: "Subscription",
          target_id: sub._id,
          description: `Attempted to send reminder to user ${sub.user_id.phone}. Status: Sent.`,

        });
      }

      console.log("Finished processing reminders.");
    } catch (error) {
      console.error("Error running reminder job:", error);
      logger.logAction({
        actor_type: "System",
        action_type: "JOB_ERROR_REMINDER_SEND",
        description: `Error during reminder sending job: ${error.message}`,
        details: { error: error.stack },
      });
    }
  }, {
    timezone: "Asia/Kolkata"
  }
  )
  console.log("Subscription expiry and reminder jobs scheduled successfully.");
};

runSubscriptionJobs()
