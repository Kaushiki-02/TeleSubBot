// routes/roleRoutes.js
const express = require("express");
const roleController = require("../controllers/roleController");
const permissionController = require("../controllers/permissionController");
const authMiddleware = require("../middleware/authMiddleware");
const validation = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(authMiddleware.protect);

router.get(
  "/",
  authMiddleware.authorize("Role:read"),
  roleController.getAllRoles
);
router.post(
  "/",
  authMiddleware.authorize("Role:create"),
  validation.validateCreateRole,
  roleController.createRole
);
router.get(
  "/:id",
  authMiddleware.authorize("Role:read"),
  validation.validateMongoIdParam("id"),
  roleController.getRole
);
router.put(
  "/:id",
  authMiddleware.authorize("Role:update"),
  validation.validateMongoIdParam("id"),
  validation.validateUpdateRole, // Use update validator
  roleController.updateRole
);
router.delete(
  "/:id",
  authMiddleware.authorize("Role:delete"),
  validation.validateMongoIdParam("id"),
  roleController.deleteRole
);

// Nested Permission Routes under Roles
router.get(
  "/:roleId/permissions",
  authMiddleware.authorize("Role:read"), // Requires read role permission to see assigned perms
  validation.validateMongoIdParam("roleId"),
  permissionController.getRolePermissions
);
router.put(
  "/:roleId/permissions",
  authMiddleware.authorize("Role:assign:permissions"),
  validation.validateAssignPermissions, // Validates roleId param and permissionIds body
  permissionController.assignPermissionsToRole
);

module.exports = router;
