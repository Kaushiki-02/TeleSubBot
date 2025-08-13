// controllers/permissionController.js
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

// List all available permissions (SuperAdmin)
exports.getAllPermissions = catchAsync(async (req, res, next) => {
  const permissions = await Permission.find().sort("resource action");
  res
    .status(200)
    .json({
      status: "success",
      results: permissions.length,
      data: { permissions },
    });
});

// Get permissions assigned to a specific role (SuperAdmin)
exports.getRolePermissions = catchAsync(async (req, res, next) => {
  const role = await Role.findById(req.params.roleId).populate("permissions");
  if (!role) {
    return next(new AppError("Role not found", 404));
  }
  res
    .status(200)
    .json({ status: "success", data: { permissions: role.permissions } });
});

// Assign permissions to a role (SuperAdmin)
exports.assignPermissionsToRole = catchAsync(async (req, res, next) => {
  const { permissionIds } = req.body; // Expecting an array of Permission ObjectIDs
  const roleId = req.params.roleId;

  if (!Array.isArray(permissionIds)) {
    return next(new AppError("permissionIds must be an array", 400));
  }

  const role = await Role.findById(roleId);
  if (!role) return next(new AppError("Role not found", 404));
  if (role.name === "SuperAdmin")
    return next(new AppError("Cannot modify SuperAdmin permissions.", 403));

  // Validate permission IDs exist
  const validPermissionIds = [];
  if (permissionIds.length > 0) {
    const validPermissions = await Permission.find({
      _id: { $in: permissionIds },
    }).select("_id");
    if (validPermissions.length !== permissionIds.length) {
      const invalidProvided = permissionIds.filter(
        (id) => !validPermissions.some((p) => p._id.equals(id))
      );
      return next(
        new AppError(
          `Invalid permission IDs provided: ${invalidProvided.join(", ")}.`,
          400
        )
      );
    }
    validPermissionIds.push(...validPermissions.map((p) => p._id));
  }

  role.permissions = validPermissionIds;
  await role.save();
  await role.populate("permissions"); // Re-populate to return updated list

  logger.logAction({
    actor_type: "SuperAdmin",
    actor_id: req.user._id,
    action_type: "ROLE_PERMISSIONS_UPDATED",
    target_type: "Role",
    target_id: roleId,
    description: `Permissions updated for role '${role.name}'. Assigned: ${validPermissionIds.length}.`,
    details: { assignedPermissionIds: validPermissionIds },
  });

  res.status(200).json({ status: "success", data: { role } });
});
