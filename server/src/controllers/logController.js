const Log = require("../models/Log");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const AppError = require("../utils/appError");

// Get Audit Logs (Requires 'Log:read' permission)
exports.getAuditLogs = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Log.find().populate("actor_id", "phone role_id"),
    req.query
  )
    .filter() // Filter by date, actor_type, action_type etc.
    .sort("-timestamp") // Sort by newest first
    .limitFields()
    .paginate();

  const logs = await features.query;
  await Log.populate(logs, { path: "actor_id.role_id", select: "name" }); // Populate role name

  res.status(200).json({
    status: "success",
    results: logs.length,
    data: {
      logs,
    },
  });
});

// Export Audit Logs (Requires 'Log:export' permission)
exports.exportAuditLogs = catchAsync(async (req, res, next) => {
  const { format = "csv", ...filters } = req.query;

  const features = new APIFeatures(
    Log.find().populate("actor_id", "phone role_id"),
    filters
  )
    .filter()
    .sort("-timestamp"); // Fetch all matching logs for export

  const logs = await features.query.lean();
  await Log.populate(logs, { path: "actor_id.role_id", select: "name" });

  if (!logs || logs.length === 0) {
    return next(new AppError("No logs found to export.", 404));
  }

  const filename = "crm_audit_logs";

  if (format.toLowerCase() === "csv") {
    const fields = [
      { label: "Timestamp", value: "timestamp" },
      { label: "Actor Type", value: "actor_type" },
      { label: "Actor Phone", value: "actor_id.phone" },
      { label: "Actor Role", value: "actor_id.role_id.name" },
      { label: "Action", value: "action_type" },
      { label: "Target Type", value: "target_type" },
      { label: "Target ID", value: "target_id" },
      { label: "Description", value: "description" },
      {
        label: "Details",
        value: (row) => (row.details ? JSON.stringify(row.details) : ""),
      },
    ];
    const json2csvParser = new Parser({ fields }); // Default includes headers with quotes
    const csv = json2csvParser.parse(logs);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.csv`
    );
    res.status(200).send(csv);
  } else if (format.toLowerCase() === "pdf") {
    console.warn("PDF export for logs requires detailed table generation.");
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.pdf`
    );
    doc.pipe(res);
    doc.fontSize(18).text("Audit Log Report", { align: "center" });
    doc.moveDown();
    // Basic PDF Table Generation - Placeholder
    const rowHeight = 15;
    const startY = doc.y;
    const headers = ["Timestamp", "Actor", "Action", "Target", "Description"];
    const colWidth = 110; // Adjust based on landscape A4
    doc.fontSize(8).font("Helvetica-Bold");
    headers.forEach((header, i) => doc.text(header, 30 + i * colWidth, startY));
    doc.font("Helvetica").moveDown(0.5);
    logs.slice(0, 100).forEach((log, rowIndex) => {
      // Limit rows for basic PDF
      const y = startY + (rowIndex + 1.5) * rowHeight;
      doc.text(
        new Date(log.timestamp).toLocaleString("en-IN"),
        30 + 0 * colWidth,
        y,
        { width: colWidth - 5, lineBreak: false }
      );
      doc.text(
        `${log.actor_type}${
          log.actor_id?.phone ? ` (${log.actor_id.phone})` : ""
        }`,
        30 + 1 * colWidth,
        y,
        { width: colWidth - 5, lineBreak: false }
      );
      doc.text(log.action_type, 30 + 2 * colWidth, y, {
        width: colWidth - 5,
        lineBreak: false,
      });
      doc.text(
        `${log.target_type || ""}${
          log.target_id ? ` (${log.target_id.toString().slice(-6)})` : ""
        }`,
        30 + 3 * colWidth,
        y,
        { width: colWidth - 5, lineBreak: false }
      );
      doc.text(log.description.substring(0, 40), 30 + 4 * colWidth, y, {
        width: colWidth - 5,
        lineBreak: false,
      });
    });
    doc.end();
  } else {
    return next(new AppError(`Unsupported format: ${format}.`, 400));
  }

  console.log(
    `Audit logs exported by ${req.user.role_id.name} ${req.user.phone} (ID: ${req.user._id})`
  );
  logger.logAction({
    actor_type: req.user.role_id.name,
    actor_id: req.user._id,
    action_type: "AUDIT_LOG_EXPORTED",
    description: `Audit logs exported (Format: ${format}).`,
  });
});
