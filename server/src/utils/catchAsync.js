// utils/catchAsync.js
// Wraps async functions to catch errors and pass them to the global error handler
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
