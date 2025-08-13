// routes/permissionRoutes.js
const express = require("express");
const permissionController = require("../controllers/permissionController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize("Role:assign:permissions")); // Only users who can assign perms can view them

router.get("/", permissionController.getAllPermissions);

module.exports = router;
