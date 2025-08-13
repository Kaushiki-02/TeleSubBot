// No changes needed from previous version, but ensure it uses error.name for checks.
const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  let value = "unknown";
  try {
    // Try parsing the more complex MongoDB 5+ error message format
    const match = err.message.match(/index: (.+?) dup key: { (.+?): "(.+?)" }/);
    if (match && match[3]) {
      value = match[3];
    } else {
      // Fallback for simpler or older formats
      const simpleMatch = err.message.match(/dup key: {.*?\"?([^:\"]+)\"? *:/);
      if (simpleMatch && simpleMatch[1]) value = simpleMatch[1]; // Extract field name
      const valueMatch = err.message.match(/dup key: {.*? "?(.+?)"? *}/);
      if (valueMatch && valueMatch[1]) value = valueMatch[1]; // Extract value
    }
  } catch (ex) {
    console.warn(
      "Could not parse duplicate key value from error:",
      err.message
    );
  }
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 409); // Use 409 Conflict for duplicates
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);
const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err, req, res) => {
  console.error("ERROR ", err);
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    return res
      .status(err.statusCode)
      .json({ status: err.status, message: err.message });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error("ERROR ", err);
  // 2) Send generic message
  return res
    .status(500)
    .json({ status: "error", message: "Something went very wrong!" });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    // Production or other environments treated as production
    let error = {
      ...err,
      message: err.message,
      name: err.name,
      code: err.code,
    }; // Ensure essential props copied

    if (error.name === "CastError") error = handleCastErrorDB(error);
    // Use code 11000 for duplicate fields, regardless of MongoDB version
    if (error.code === 11000 || error.code === 11001)
      error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    // Handle potential crypto errors like timingSafeEqual length mismatch as internal server errors
    if (error.code === "ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH") {
      console.error("CRYPTO ERROR:", error); // Log crypto error specifically
      error = new AppError("Internal security check failed.", 500);
    }

    sendErrorProd(error, req, res);
  }
};
