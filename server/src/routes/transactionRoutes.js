// routes/transactionRoutes.js
const express = require("express");
const transactionController = require("../controllers/transactionController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(authMiddleware.protect);

// User routes
router.post(
  "/order",
  authMiddleware.authorize("Transaction:create:order"),
  validation.validateCreateTransactionOrder,
  transactionController.initiateSubscribe
);
router.get(
  "/my-history",
  authMiddleware.authorize("Transaction:read:own"),
  transactionController.getMyTransactionHistory
);

// Admin/SuperAdmin/Support read routes
router.get(
  "/",
  authMiddleware.authorize("Transaction:read:all"),
  transactionController.getAllTransactions
);
// router.get(
//   "/reconcile",
//   authMiddleware.authorize("Transaction:reconcile"),
//   transactionController.getReconciliationData
// );

router.get(
  "/incomplete",
  authMiddleware.authorize("Transaction:read"),
  transactionController.getincompleteTransaction
);
router.get(
  "/:id",
  authMiddleware.authorize("Transaction:read"),
  validation.validateMongoIdParam("id"),
  transactionController.getTransaction
);
router.get(
  "/:id/invoice",
  authMiddleware.authorize("Transaction:read:invoice"), // Permission to view invoice
  validation.validateMongoIdParam("id"),
  transactionController.getTransactionInvoice
);
module.exports = router;
