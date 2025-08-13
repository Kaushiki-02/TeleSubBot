// Function to handle the webhook events from Telegram
const User = require("../models/User");
const Channel = require("../models/Channel");
const Role = require("../models/Role");
const Subscription = require("../models/Subscription")
const Link = require("../models/Link")
exports.handleTelegramWebhook = async (req, res) => {
  try {
    const update = req.body;
    // console.log("TELEWEB: Received update ->", JSON.stringify(update, null, 2));

    // Handle bot being promoted to admin (my_chat_member)
    if (update.my_chat_member) {
      console.log("TELEWEB: Processing my_chat_member update");

      const chat = update.my_chat_member.chat;
      const from = update.my_chat_member.from;
      const newChatMember = update.my_chat_member.new_chat_member;

      if (newChatMember.status === "administrator") {
        const chatId = chat.id;
        const channelTitle = chat.title || chat.username;
        console.log(`TELEWEB: Bot promoted to admin in chat: ${channelTitle} (${chatId}) by ${from.username}`);

        // Find or create the owner
        let owner = await User.findOne({ telegram_username: from.username }).select('+loginId');
        if (!owner) {
          console.log(`TELEWEB: No existing owner found for ${from.username}, creating new user...`);
          // const userRole = await Role.findOne({ name: "Admin" });

          // if (!userRole) {
          //   console.error("CRITICAL: Default 'Admin' role not found in database.");
          //   return res.status(500).send("System configuration error. Cannot register user.");
          // }

          // owner = await User.create({
          //   telegram_id: from.id,
          //   telegram_username: from.username,
          //   role: userRole._id,
          //   phone: from.id,
          //   channels: [],
          //   name: `${from.first_name} ${from.last_name}`,
          // });

          // console.log(`TELEWEB: Created new owner: ${owner.name} (${owner.telegram_username})`);
        } else {
          console.log(`TELEWEB: Found existing owner: ${owner.name} (${owner.telegram_username})`);
        }

        // Check if channel already exists
        let channel = await Channel.findOne({ telegram_chat_id: chatId });
        if (!channel) {
          channel = await Channel.create({
            name: channelTitle,
            telegram_chat_id: chatId,
            owner: owner._id,
          });

          owner.telegram_id = from.id;
          owner.channels.push(channel._id);
          await owner.save();

          console.log(`TELEWEB: New channel created: ${channelTitle} (ID: ${channel._id})`);
        } else {
          console.log(`TELEWEB: Channel already exists: ${channel.name}`);
        }

        return res.status(200).send("Handled my_chat_member successfully");
      }
    }

    // Handle user joining/leaving
    if (update.chat_member) {
      console.log("TELEWEB: Processing chat_member update");
      const chatId = update.chat_member.chat.id;

      const channel = await Channel.findOne({ telegram_chat_id: chatId });
      if (!channel) {
        console.warn(`TELEWEB: Channel with ID ${chatId} not found in DB.`);
        return res.status(400).send("Channel does not exist in the database.");
      }

      const newMember = update.chat_member.new_chat_member;
      const status = newMember?.status;

      if (status === "member") {
        console.log("TELEWEB: New member joined the channel");

        try {
          const { id, first_name, last_name, username } = newMember.user;
          const link = update.chat_member.invite_link?.invite_link;

          console.log(`TELEWEB: New user joined via invite link: ${link}`);
          const exilink = await Link.findOne({ url_slug: link });

          if (!exilink) {
            console.warn("TELEWEB: Invite link not found in DB.");
            return res.status(404).send("Invite link not associated with any subscription.");
          }

          const sub = await Subscription.findOne({ link_id: exilink._id });

          let existingUser = await User.findById(sub.user_id);
          if (!existingUser) {
            console.warn(`TELEWEB: User not found for subscription ${sub._id}`);
            return res.status(404).send("User not found.");
          }

          if (!existingUser.channels.includes(channel._id)) {
            existingUser.channels.push(channel._id);
            await existingUser.save();
            console.log(`TELEWEB: User ${first_name} ${last_name} added to channel ${channel.name}`);
          } else {
            console.log(`TELEWEB: User ${first_name} already in channel ${channel.name}`);
          }

          sub.telegramUser_id = id;
          sub.status = "active";
          await sub.save();

          // logger.logAction({
          //   actor_id: exilink._id,
          //   action_type: "USER_INVITE_SUBSCRIBED",
          //   target_type: "subscription",
          //   description: `Invite link ${link} is associated with subscription ${sub._id}`,
          // });
        } catch (e) {
          // logger.logAction({
          //   action_type: "INVITE_LINK_NOT_SUBSCRIBED",
          //   target_type: "subscription",
          //   description: `Invite link is not associated with any subscription. Error: ${e.message}`,
          // });
          console.error("TELEWEB: Error processing user join", e);
        }
      }

      // User leaves
      if (status === "left") {
        console.log("TELEWEB: User left the channel");

        try {
          const { id, first_name, last_name, username } = newMember.user;
          const sub = await Subscription.findOne({ telegramUser_id: id });

          if (!sub) {
            console.warn(`TELEWEB: No subscription found for Telegram user ${id}`);
            return res.status(404).send("Subscription not found.");
          }

          const existingUser = await User.findById(sub.user_id);
          if (existingUser) {
            existingUser.channels = existingUser.channels.filter(
              (channelId) => channelId.toString() !== channel._id.toString()
            );
            await existingUser.save();

            console.log(`TELEWEB: User left: ${first_name} ${last_name} (${username}) removed from channel.`);
            // logger.logAction({
            //   actor_id: sub._id,
            //   action_type: "USER_REMOVED",
            //   target_type: "subscription",
            //   description: `User ${existingUser._id} removed from channel ${sub.channel_id} with subscription ${sub._id}`,
            // });
          } else {
            console.warn(`TELEWEB: No user found for subscription ${sub._id}`);
          }
        } catch (e) {
          // logger.logAction({
          //   action_type: "USER_NOT_REMOVED",
          //   target_type: "subscription",
          //   description: `Bot could not remove the user. Error: ${e.message}`,
          // });
          console.error("TELEWEB: Error removing user from channel", e);
        }
      }
    }

    // Fallback if nothing handled
    console.log("TELEWEB: No my_chat_member or chat_member actions matched.");
    res.status(200).send("Webhook received successfully");
  } catch (error) {
    console.error("TELEWEB: Error handling Telegram webhook:", error);
    res.status(500).send("Internal Server Error");
  }
};

