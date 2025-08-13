// middleware/uploadMiddleware.js
const os = require("os"); // Added OS import
const multer = require("multer");
const AppError = require("../utils/appError");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()), // Use OS temp directory
  filename: (req, file, cb) =>
    cb(
      null,
      `crm-upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${
        file.originalname
      }`
    ), // Add randomness
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "text/csv" ||
    file.originalname.toLowerCase().endsWith(".csv")
  ) {
    cb(null, true); // Accept CSV
  } else {
    cb(
      new AppError("Invalid file type. Only CSV files are allowed.", 400),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

exports.uploadCsv = upload.single("file"); // Expect file under field name 'file'
