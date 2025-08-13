// controllers/roleController.js
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

// List all roles (Requires 'Role:read')
exports.getAllRoles = catchAsync(async (req, res, next) => {
  const roles = await Role.find().populate("permissions");
  res
    .status(200)
    .json({ status: "success", results: roles.length, data: { roles } });
});

// Create a new role (Requires 'Role:create')
exports.createRole = catchAsync(async (req, res, next) => {
  const { name, description, permissionIds } = req.body;

  let permissions = [];
  if (permissionIds && permissionIds.length > 0) {
    permissions = await Permission.find({ _id: { $in: permissionIds } });
    if (permissions.length !== permissionIds.length) {
      return next(new AppError("One or more permission IDs invalid.", 400));
    }
  }

  const newRole = await Role.create({
    name,
    description,
    permissions: permissions.map((p) => p._id),
  });
  logger.logAction({
    actor_type: "SuperAdmin",
    actor_id: req.user._id,
    action_type: "ROLE_CREATED",
    target_type: "Role",
    target_id: newRole._id,
    description: `Role '${name}' created.`,
  });
  res.status(201).json({ status: "success", data: { role: newRole } });
});

// Get a single role (Requires 'Role:read')
exports.getRole = catchAsync(async (req, res, next) => {
  const role = await Role.findById(req.params.id).populate("permissions");
  if (!role) return next(new AppError("Role not found", 404));
  res.status(200).json({ status: "success", data: { role } });
});

// Update a role (Requires 'Role:update')
exports.updateRole = catchAsync(async (req, res, next) => {
  const { name, description, permissionIds } = req.body;
  const roleId = req.params.id;

  const role = await Role.findById(roleId);
  if (!role) return next(new AppError("Role not found", 404));
  // Updated: Check against all core roles
  if (["SuperAdmin", "Admin", "Sales", "Support", "User"].includes(role.name)) {
    return next(
      new AppError(`Cannot update core '${role.name}' role details.`, 403)
    );
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  if (permissionIds !== undefined) {
    if (!Array.isArray(permissionIds))
      return next(new AppError("permissionIds must be array", 400));
    const validPermissions = await Permission.find({
      _id: { $in: permissionIds },
    });
    if (validPermissions.length !== permissionIds.length)
      return next(new AppError("Invalid permission IDs.", 400));
    updateData.permissions = validPermissions.map((p) => p._id);
  }

  const updatedRole = await Role.findByIdAndUpdate(roleId, updateData, {
    new: true,
    runValidators: true,
  });
  await updatedRole.populate("permissions"); // Re-populate

  logger.logAction({
    actor_type: "SuperAdmin",
    actor_id: req.user._id,
    action_type: "ROLE_UPDATED",
    target_type: "Role",
    target_id: roleId,
    description: `Role '${updatedRole.name}' updated.`,
  });
  res.status(200).json({ status: "success", data: { role: updatedRole } });
});

// Delete a role (Requires 'Role:delete')
exports.deleteRole = catchAsync(async (req, res, next) => {
  const roleId = req.params.id;
  const role = await Role.findById(roleId);
  if (!role) return next(new AppError("Role not found", 404));
  if (["SuperAdmin", "Admin", "Sales", "Support", "User"].includes(role.name))
    return next(new AppError(`Cannot delete core '${role.name}' role.`, 400));

  const usersWithRole = await User.countDocuments({ role_id: roleId });
  if (usersWithRole > 0)
    return next(
      new AppError(
        `Cannot delete role '${role.name}', ${usersWithRole} user(s) assigned.`,
        400
      )
    );

  await Role.findByIdAndDelete(roleId);
  logger.logAction({
    actor_type: "SuperAdmin",
    actor_id: req.user._id,
    action_type: "ROLE_DELETED",
    target_type: "Role",
    target_id: roleId,
    description: `Role '${role.name}' deleted.`,
  });
  res.status(204).json({ status: "success", data: null });
});
