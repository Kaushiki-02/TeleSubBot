const Link = require("../models/Link");
const Channel = require("../models/Channel");
const Plan = require("../models/Plan");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const slugify = require("slugify");
const mongoose = require("mongoose");
const { Parser } = require("json2csv");
const csv = require("csv-parser");
const fs = require("fs");
const os = require("os"); // For temp directory in import
const stream = require("stream");
const { promisify } = require("util");
const pipeline = promisify(stream.pipeline); // Use pipeline for streams

// Create Link (Requires 'Link:create' permission)
exports.createLink = catchAsync(async (req, res, next) => {
  const { name, channel_id, url_slug, campaign_tag, expires_at, usage_cap } =
    req.body;
  const created_by = req.user._id;

  const channelExists = await Channel.findById(channel_id);
  if (!channelExists) return next(new AppError("Channel not found.", 404));

  let finalSlug = url_slug;
  if (!finalSlug && name) {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let unique = false,
      attempts = 0;
    while (!unique && attempts < 5) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      if (!(await Link.findOne({ url_slug: finalSlug }))) unique = true;
      attempts++;
    }
    if (!unique)
      return next(new AppError("Could not generate unique slug.", 500));
  } else if (finalSlug) {
    if (await Link.findOne({ url_slug: finalSlug }))
      return next(new AppError(`Slug already taken.`, 400));
  } else {
    return next(new AppError("Link name required for auto-slug.", 400));
  }

  const newLink = await Link.create({
    name,
    channel_id,
    url_slug: finalSlug,
    created_by,
    campaign_tag,
    expires_at,
    usage_cap,
  });
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "LINK_CREATED",
    target_type: "Link",
    target_id: newLink._id,
    description: `Link '${newLink.name}' created.`,
  });
  res.status(201).json({ status: "success", data: { link: newLink } });
});

// Get Public Link Details (Public)
exports.getPublicLinkDetails = catchAsync(async (req, res, next) => {
  const { slug } = req.params;
  // Find link first, check expiry/cap before incrementing click
  const link = await Link.findOne({ url_slug: slug });
  if (!link) return next(new AppError("Invite link not found.", 404));
  if (link.expires_at && link.expires_at < Date.now())
    return next(new AppError("Link expired.", 410));
  if (link.usage_cap && link.subscription_count >= link.usage_cap)
    return next(new AppError("Link usage limit reached.", 410));

  // Increment click count after validation
  link.click_count += 1;
  await link.save();

  const linkDetails = await Link.findById(link._id).populate({
    path: "channel_id",
    select: "name description associated_plan_ids",
    populate: {
      path: "associated_plan_ids",
      match: { is_active: true },
      select: "name markup_price discounted_price validity_days description",
    },
  });
  if (!linkDetails?.channel_id)
    return next(new AppError("Link data incomplete.", 404));

  const responseData = {
    linkName: linkDetails.name,
    channelName: linkDetails.channel_id.name,
    channelDescription: linkDetails.channel_id.description,
    plans: linkDetails.channel_id.associated_plan_ids,
  };
  res.status(200).json({ status: "success", data: responseData });
});

// Get All Links (Requires 'Link:read:all' permission)
exports.getAllLinks = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Link.find().populate("channel_id", "name").populate("created_by", "phone"),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const links = await features.query;
  res
    .status(200)
    .json({ status: "success", results: links.length, data: { links } });
});

// Get Links Created By Me (Requires 'Link:read:own' permission)
exports.getMyLinks = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Link.find({ created_by: req.user._id }).populate("channel_id", "name"),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const links = await features.query;
  res
    .status(200)
    .json({ status: "success", results: links.length, data: { links } });
});

// Get Single Link (Requires 'Link:read:all' or ('Link:read:own' and owner))
exports.getLink = catchAsync(async (req, res, next) => {
  // Middleware `authorize('Link:read:all', 'Link:read:own')` ensures user has at least one base perm.
  const link = await Link.findById(req.params.id)
    .populate("channel_id", "name")
    .populate("created_by", "phone");
  if (!link) return next(new AppError("Link not found", 404));

  // Permission check only needed if user lacks the 'all' permission
  const canReadAll = req.user.role_id.permissions.some(
    (p) => p.resource === "Link" && p.action === "read:all"
  );
  if (!canReadAll) {
    // User only has 'read:own'
    if (!link.created_by._id.equals(req.user._id)) {
      return next(
        new AppError(
          "Permission denied. You can only view your own links.",
          403
        )
      );
    }
  }
  // If user has 'read:all' OR it's their own link (checked above), allow access
  res.status(200).json({ status: "success", data: { link } });
});

// Update Link (Requires 'Link:update:all' or ('Link:update:own' and owner))
exports.updateLink = catchAsync(async (req, res, next) => {
  const link = await Link.findById(req.params.id);
  if (!link) return next(new AppError("Link not found", 404));

  // Middleware `authorize('Link:update:all', 'Link:update:own')` ensures user has at least one base perm.
  const canUpdateAll = req.user.role_id.permissions.some(
    (p) => p.resource === "Link" && p.action === "update:all"
  );
  const isOwner = link.created_by.equals(req.user._id);

  if (!canUpdateAll && !isOwner) {
    // User only has 'update:own' but isn't owner
    return next(new AppError("Permission denied to update this link.", 403));
  }
  // If user has 'update:all' OR is the owner (and has 'update:own'), proceed

  const forbiddenFields = [
    "channel_id",
    "created_by",
    "click_count",
    "otp_verification_count",
    "subscription_count",
    "url_slug",
  ];
  forbiddenFields.forEach((field) => {
    if (req.body[field]) delete req.body[field];
  });

  const updatedLink = await Link.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("channel_id", "name")
    .populate("created_by", "phone");
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "LINK_UPDATED",
    target_type: "Link",
    target_id: updatedLink._id,
    description: `Link '${updatedLink.name}' updated.`,
  });
  res.status(200).json({ status: "success", data: { link: updatedLink } });
});

// Delete Link (Requires 'Link:delete:all' or ('Link:delete:own' and owner))
exports.deleteLink = catchAsync(async (req, res, next) => {
  const link = await Link.findById(req.params.id);
  if (!link) return next(new AppError("Link not found", 404));

  // Middleware `authorize('Link:delete:all', 'Link:delete:own')` ensures user has at least one base perm.
  const canDeleteAll = req.user.role_id.permissions.some(
    (p) => p.resource === "Link" && p.action === "delete:all"
  );
  const isOwner = link.created_by.equals(req.user._id);

  if (!canDeleteAll && !isOwner) {
    // User only has 'delete:own' but isn't owner
    return next(new AppError("Permission denied to delete this link.", 403));
  }
  // If user has 'delete:all' OR is the owner (and has 'delete:own'), proceed

  await Link.findByIdAndDelete(req.params.id);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "LINK_DELETED",
    target_type: "Link",
    target_id: req.params.id,
    description: `Link '${link.name}' deleted.`,
  });
  res.status(204).json({ status: "success", data: null });
});

// Import Links (Requires 'Link:import' permission)
exports.importLinks = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError("Please upload a CSV file.", 400));

  const results = [];
  const errors = [];
  let rowCount = 0;
  const filePath = req.file.path;
  const requiredHeaders = ["name", "channel_telegram_id"]; // Minimum required
  let headersValidated = false;

  try {
    const parser = fs.createReadStream(filePath).pipe(
      csv({
        mapHeaders: ({ header }) => header.trim(),
        strict: true, // Ensure row column count matches headers
        mapValues: ({ header, value }) => value.trim(), // Trim values
      })
    );

    parser.on("headers", (headers) => {
      if (!requiredHeaders.every((h) => headers.includes(h))) {
        parser.destroy(
          new AppError(
            `CSV missing required headers: ${requiredHeaders.join(", ")}`,
            400
          )
        );
        return;
      }
      headersValidated = true;
    });

    const processRow = async (row) => {
      rowCount++;
      if (!headersValidated) return; // Wait for header validation
      const {
        name,
        channel_telegram_id,
        url_slug,
        campaign_tag,
        expires_at,
        usage_cap,
      } = row;
      if (!name || !channel_telegram_id) {
        errors.push({
          row: rowCount,
          error: "Missing name or channel_telegram_id",
        });
        return;
      }
      try {
        const channel = await Channel.findOne({
          telegram_chat_id: channel_telegram_id,
        });
        if (!channel) {
          errors.push({
            row: rowCount,
            error: `Channel ${channel_telegram_id} not found.`,
          });
          return;
        }
        let finalSlug = url_slug?.trim();
        if (!finalSlug) {
          finalSlug = `${slugify(name.trim(), {
            lower: true,
            strict: true,
          })}-${Math.random().toString(36).substring(2, 8)}`;
        }
        if (await Link.findOne({ url_slug: finalSlug })) {
          errors.push({
            row: rowCount,
            error: `Slug '${finalSlug}' already exists.`,
          });
          return;
        }
        const linkData = {
          name: name.trim(),
          channel_id: channel._id,
          url_slug: finalSlug,
          created_by: req.user._id,
          campaign_tag,
          expires_at: expires_at ? new Date(expires_at) : undefined,
          usage_cap: usage_cap ? parseInt(usage_cap, 10) : undefined,
        };
        if (linkData.expires_at && isNaN(linkData.expires_at.getTime())) {
          errors.push({ row: rowCount, error: `Invalid date: ${expires_at}` });
          return;
        }
        if (linkData.usage_cap && isNaN(linkData.usage_cap)) {
          errors.push({ row: rowCount, error: `Invalid number: ${usage_cap}` });
          return;
        }
        const newLink = await Link.create(linkData);
        results.push({ row: rowCount, id: newLink._id });
      } catch (error) {
        errors.push({ row: rowCount, error: error.message });
      }
    };

    // Process stream
    await pipeline(
      parser,
      new stream.Writable({
        objectMode: true,
        write(row, encoding, callback) {
          processRow(row)
            .then(() => callback())
            .catch(callback);
        },
      })
    );

    logger.logAction({
      actor_type: req.user.role_id.name,
      actor_id: req.user._id,
      action_type: "LINK_IMPORT_COMPLETED",
      description: `Link import: ${results.length} succeeded, ${errors.length} failed.`,
      details: { errors },
    });
    res
      .status(200)
      .json({
        status: "success",
        message: `Import finished. ${results.length} succeeded, ${errors.length} failed.`,
        data: { succeeded: results, errors },
      });
  } catch (error) {
    // Catch errors from pipeline or header validation
    next(error);
  } finally {
    // Ensure temp file is deleted
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting uploaded CSV:", err);
    });
  }
});

// Export Links (Requires 'Link:export' permission)
exports.exportLinks = catchAsync(async (req, res, next) => {
  const links = await Link.find()
    .populate("channel_id", "name")
    .populate("created_by", "phone")
    .lean();
  if (!links || links.length === 0)
    return next(new AppError("No links to export.", 404));

  const fields = [
    { label: "ID", value: "_id" },
    { label: "Name", value: "name" },
    { label: "Slug", value: "url_slug" },
    { label: "Channel", value: "channel_id.name" },
    { label: "Created By (Phone)", value: "created_by.phone" },
    { label: "Campaign", value: "campaign_tag" },
    { label: "Expires At", value: "expires_at" },
    { label: "Usage Cap", value: "usage_cap" },
    { label: "Clicks", value: "click_count" },
    { label: "OTP Verifs", value: "otp_verification_count" },
    { label: "Subs", value: "subscription_count" },
    { label: "Created At", value: "createdAt" },
  ];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(links);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=crm_links.csv");
  res.status(200).send(csv);
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "LINK_DATA_EXPORTED",
    description: `Link data exported.`,
  });
});
