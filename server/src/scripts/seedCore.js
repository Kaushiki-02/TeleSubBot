// src/scripts/seedCore.js
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../config.env"),
});
const mongoose = require("mongoose");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const User = require("../models/User");

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    const mongoURI =
      process.env.NODE_ENV === "development"
        ? process.env.MONGO_URI
        : process.env.MONGO_URI_PROD;

    // Use MONGO_URI from .env
    if (!mongoURI) {
      throw new Error("MONGO_URI environment variable not defined.");
    }
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected for Core Seeding...");
  } catch (err) {
    console.error("Error connecting to MongoDB for Core Seeding:", err.message);
    process.exit(1);
  }
};

// --- Permissions Definition (Ensure list is complete) ---
const permissionsData = [
  { resource: "User", action: "read:own", description: "Read own profile" },
  {
    resource: "User",
    action: "update:own",
    description: "Update own profile/link telegram",
  },
  { resource: "User", action: "submit:kyc", description: "Submit own KYC" },
  {
    resource: "User",
    action: "read:all",
    description: "Read all user profiles",
  },
  {
    resource: "User",
    action: "read",
    description: "Read specific user profile",
  },
  {
    resource: "User",
    action: "update:role",
    description: "Assign role to user",
  },
  {
    resource: "User",
    action: "create",
    description: "Create new users (e.g., Admin, Support, Sales)",
  },
  {
    resource: "User",
    action: "update",
    description: "Update users (e.g., Admin, Support, Sales) [Password]",
  },
  { resource: "User", action: "export", description: "Export user data" },
  { resource: "Plan", action: "read", description: "Read plans" },
  { resource: "Plan", action: "create", description: "Create plans" },
  { resource: "Plan", action: "update", description: "Update plans" },
  { resource: "Plan", action: "delete", description: "Delete plans" },
  { resource: "Channel", action: "read", description: "Read channels" },
  { resource: "Channel", action: "create", description: "Create channels" },
  { resource: "Channel", action: "update", description: "Update channels" },
  { resource: "Channel", action: "delete", description: "Delete channels" },
  { resource: "Link", action: "read:own", description: "Read own links" },
  { resource: "Link", action: "read:all", description: "Read all links" },
  { resource: "Link", action: "read", description: "Read specific link" },
  { resource: "Link", action: "create", description: "Create links" },
  { resource: "Link", action: "update:own", description: "Update own links" },
  { resource: "Link", action: "update:all", description: "Update any link" },
  { resource: "Link", action: "delete:own", description: "Delete own links" },
  { resource: "Link", action: "delete:all", description: "Delete any link" },
  { resource: "Link", action: "import", description: "Import links" },
  { resource: "Link", action: "export", description: "Export links" },
  {
    resource: "Subscription",
    action: "read:own",
    description: "Read own subscriptions",
  },
  {
    resource: "Subscription",
    action: "read:all",
    description: "Read all subscriptions",
  },
  {
    resource: "Subscription",
    action: "read",
    description: "Read specific subscription",
  },
  {
    resource: "Subscription",
    action: "renew",
    description: "Initiate own renewal",
  },
  {
    resource: "Subscription",
    action: "upgrade",
    description: "Initiate own upgrade",
  },
  {
    resource: "Subscription",
    action: "extend",
    description: "Extend subscription (Support/SA)",
  },
  {
    resource: "Subscription",
    action: "revoke",
    description: "Revoke subscription (Admin/SA)",
  },
  {
    resource: "Transaction",
    action: "read:own",
    description: "Read own transactions",
  },
  {
    resource: "Transaction",
    action: "read:all",
    description: "Read all transactions",
  },
  {
    resource: "Transaction",
    action: "read",
    description: "Read specific transaction",
  },
  {
    resource: "Transaction",
    action: "create:order",
    description: "Create payment order",
  },
  {
    resource: "Transaction",
    action: "verify:payment",
    description: "Verify own payment",
  },
  {
    resource: "Transaction",
    action: "reconcile",
    description: "Access reconciliation data",
  },
  {
    resource: "Transaction",
    action: "read:invoice",
    description: "View invoice",
  },
  {
    resource: "ReminderTemplate",
    action: "read",
    description: "Read reminder templates",
  },
  {
    resource: "ReminderTemplate",
    action: "create",
    description: "Create reminder templates",
  },
  {
    resource: "ReminderTemplate",
    action: "update",
    description: "Update reminder templates",
  },
  {
    resource: "ReminderTemplate",
    action: "delete",
    description: "Delete reminder templates",
  },
  {
    resource: "Reminder",
    action: "read",
    description: "Read delivery reports",
  },
  {
    resource: "Analytics",
    action: "read:revenue",
    description: "View revenue reports",
  },
  {
    resource: "Analytics",
    action: "read:subscription",
    description: "View subscription metrics",
  },
  {
    resource: "Analytics",
    action: "read:churn",
    description: "View churn reports",
  },
  {
    resource: "Analytics",
    action: "read:ltv",
    description: "View LTV reports",
  },
  {
    resource: "Analytics",
    action: "read:link:own",
    description: "View own link conversion",
  },
  {
    resource: "Analytics",
    action: "read:link:all",
    description: "View all link conversion",
  },
  { resource: "Analytics", action: "export", description: "Export analytics" },
  {
    resource: "Analytics",
    action: "read:dashboard",
    description: "View overall dashboard summary",
  },
  { resource: "Log", action: "read", description: "Read audit logs" },
  { resource: "Log", action: "export", description: "Export audit logs" },
  { resource: "FAQ", action: "read", description: "Read FAQs" },
  { resource: "FAQ", action: "manage", description: "Manage FAQs (CUD)" },
  { resource: "Role", action: "read", description: "Read roles" },
  { resource: "Role", action: "create", description: "Create roles" },
  { resource: "Role", action: "update", description: "Update roles" },
  { resource: "Role", action: "delete", description: "Delete roles" },
  {
    resource: "Role",
    action: "assign:permissions",
    description: "Assign permissions to roles",
  },
  { resource: "Setting", action: "read", description: "Read settings" },
  {
    resource: "Setting",
    action: "manage",
    description: "Manage settings (CUD)",
  },
];

// --- Roles Definition ---
const roles = [
  {
    name: "SuperAdmin",
    description: "Platform owner with all permissions",
    permissionKeys: permissionsData.map((p) => `${p.resource}:${p.action}`), // Assigns ALL permissions defined above
  },
  {
    name: "Admin",
    description: "System operations manager for owned channels and team",
    permissionKeys: [
      "User:read:own",
      "User:update:own",
      "User:submit:kyc", // Can submit KYC for self (if applicable)
      "User:read:all", // Can see all users
      "User:read", // Can read specific users (self or team)
      "User:create", // Allows creating Sales/Support team members
      "User:export", // Added export for Admin
      // Channel Management (Full for Owned)
      "Channel:read",
      "Channel:create",
      "Channel:update",
      "Channel:delete",
      // Plan Management (Full for Owned Channels)
      "Plan:read",
      "Plan:create",
      "Plan:update",
      "Plan:delete",
      // Link Management (Can manage links for their channels)
      "Link:read:all", // Can read all links (implicit for their channels)
      "Link:read",
      "Link:create",
      "Link:update:all", // Can update links for their channels
      "Link:delete:all", // Can delete links for their channels
      "Link:import",
      "Link:export",
      // Subscription Management (For Owned Channels)
      "Subscription:read:all", // Can read all subscriptions (filtered by channel ownership)
      "Subscription:read",
      "Subscription:revoke",
      "Subscription:extend",
      // Transaction Management (Read for Owned Channels)
      "Transaction:read:all", // Can read transactions (filtered by channel ownership)
      "Transaction:read",
      "Transaction:read:invoice",
      // Analytics (Read scoped data)
      "Analytics:read:dashboard",
      "Analytics:read:revenue",
      "Analytics:read:subscription",
      "Analytics:read:churn",
      "Analytics:read:ltv",
      "Analytics:read:link:all", // Can see link analytics for their channels
      "Analytics:export", // Can export analytics for their scope
      // FAQs (Read & Manage)
      "FAQ:read",
      "FAQ:manage",
      // Settings (Read) - Can view settings? Or only those specific to their channels? Grant basic read for now.
      "Setting:read",
    ],
  },
  {
    name: "Sales",
    description: "Lead generation, link management, and user interaction",
    permissionKeys: [
      "User:read:own",
      "User:update:own",
      "User:submit:kyc",
      "User:read", // Can view specific users (scoped by backend logic)
      "Link:read:own", // Own links (those they created)
      "Link:read", // Specific links (if allowed by backend scope)
      "Link:create", // Can create links
      "Link:update:own", // Can update own links
      "Link:delete:own", // Can delete own links
      "Analytics:read:link:own", // Can see analytics for their own links
      "Channel:read", // Can see channel details (if allowed by backend scope)
      "Plan:read", // Can see plan details (if allowed by backend scope)
      "Subscription:read", // Can view specific subscriptions (scoped by backend)
      "Subscription:extend", // Can extend subscriptions (scoped by backend)
      "Transaction:read", // Can view specific transactions (scoped by backend)
      "Transaction:read:invoice", // Can view invoices (scoped by backend)
      "FAQ:read", // Can read FAQs
    ],
  },
  {
    name: "Support",
    description:
      "Subscriber assistance, issue resolution, and manual subscription actions",
    permissionKeys: [
      "User:read:own",
      "User:update:own",
      "User:submit:kyc",
      "User:read:all", // Can see all users to find subscribers
      "User:read", // Can read specific user profiles for support cases
      "Subscription:read:all", // Can see all subscriptions (scoped by backend)
      "Subscription:read", // Can view specific subscription details
      "Subscription:extend", // Can extend subscriptions manually
      "Transaction:read:all", // Can see all transactions (scoped by backend)
      "Transaction:read", // Can view specific transaction details
      "Transaction:read:invoice", // Can view invoices (scoped by backend)
      "Channel:read", // Can see channel details
      "Plan:read", // Can see plan details
      "FAQ:read", // Can read FAQs
      "ReminderTemplate:read", // Can view reminder templates?
      "Reminder:read", // Can view delivery reports?
    ],
  },
  {
    name: "User",
    description: "Standard subscriber with self-service capabilities",
    permissionKeys: [
      "User:read:own",
      "User:update:own",
      "User:submit:kyc",
      "Subscription:read:own",
      "Subscription:renew",
      "Subscription:upgrade",
      "Transaction:read:own",
      "Transaction:create:order",
      "Transaction:verify:payment",
      "Transaction:read:invoice",
      "Channel:read"
    ],
  },
];

const seedCoreData = async () => {
  await connectDB();
  try {
    console.log("--- Starting Core Seed (Permissions & Roles) ---");
    console.log("Clearing existing Permissions and Roles...");
    await Permission.deleteMany({});
    await Role.deleteMany({});

    console.log("Seeding Permissions...");
    const createdPermissions = await Permission.insertMany(permissionsData);
    const permMap = new Map(
      createdPermissions.map((p) => [`${p.resource}:${p.action}`, p._id])
    );
    console.log(`${createdPermissions.length} permissions seeded.`);

    console.log("Seeding Roles...");
    const rolesToCreate = roles.map((roleData) => ({
      name: roleData.name,
      description: roleData.description || `${roleData.name} Role`,
      permissions: roleData.permissionKeys
        .map((key) => {
          const permId = permMap.get(key);
          if (!permId)
            console.warn(
              `Permission key '${key}' for role '${roleData.name}' not found in seeded permissions.`
            );
          return permId;
        })
        .filter((id) => !!id), // Remove any undefined/null IDs
    }));
    const createdRoles = await Role.insertMany(rolesToCreate);
    const roleMap = new Map(createdRoles.map((r) => [r.name, r._id]));
    console.log(`${createdRoles.length} roles seeded.`);

    console.log("Seeding SuperAdmin User...");
    const superAdminLoginId = process.env.SUPER_ADMIN_LOGIN_ID;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    // SuperAdmin should NOT rely on phone login primarily
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE || null;
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || null;
    const superAdminRoleId = roleMap.get("SuperAdmin");

    if (!superAdminRoleId) throw new Error("SuperAdmin role failed to seed!");
    if (!superAdminLoginId || !superAdminPassword) {
      // Log warning if primary login method is not fully configured
      console.warn(
        "SUPER_ADMIN_LOGIN_ID or SUPER_ADMIN_PASSWORD not set in .env. SuperAdmin password login will not be possible."
      );
      if (!superAdminPhone) {
        console.error(
          "CRITICAL: Neither Login ID/Password nor Phone is set for SuperAdmin. Cannot seed Super Admin user."
        );
        // Depending on criticality, you might want to exit here: process.exit(1);
      }
    }

    // Find or create SuperAdmin by loginId (preferred) or phone (fallback if loginId not set)
    let saUser = null;
    if (superAdminLoginId) {
      saUser = await User.findOne({ loginId: superAdminLoginId });
    }
    // Fallback to phone if loginId wasn't provided or found
    if (!saUser && superAdminPhone) {
      saUser = await User.findOne({ phone: superAdminPhone });
    }

    if (!saUser) {
      console.log(
        `Creating SuperAdmin user (Login ID: ${superAdminLoginId || "N/A"
        }, Phone: ${superAdminPhone || "N/A"})...`
      );
      saUser = await User.create({
        phone: superAdminPhone, // Store phone if provided, otherwise null
        loginId: superAdminLoginId, // Store loginId if provided
        password: superAdminPassword, // Password will be hashed by pre-save hook IF loginId is present
        role_id: superAdminRoleId,
        otp_verified_at: new Date(), // Mark as verified by default for system roles
        name: "Super Admin",
        channels: [],
        belongs_to: null, // SA does not belong to anyone,
        email: superAdminEmail
      });
      console.log(`SuperAdmin user created with ID: ${saUser._id}`);
    } else {
      // Update existing user if needed
      let updated = false;
      if (!saUser.role_id || !saUser.role_id.equals(superAdminRoleId)) {
        saUser.role_id = superAdminRoleId;
        updated = true;
      }
      // Ensure loginId is correct if provided in .env
      if (superAdminLoginId && saUser.loginId !== superAdminLoginId) {
        saUser.loginId = superAdminLoginId;
        updated = true;
      } else if (!superAdminLoginId && saUser.loginId) {
        // If SA_LOGIN_ID was removed from .env but user has one, keep it or clear? Keeping is safer.
      }

      // Ensure phone is correct if provided in .env
      if (superAdminPhone && saUser.phone !== superAdminPhone) {
        saUser.phone = superAdminPhone;
        updated = true;
      } else if (!superAdminPhone && saUser.phone) {
        // If SA_PHONE was removed from .env but user has one, keep it or clear? Keeping is safer.
      }

      if (!saUser.otp_verified_at) {
        saUser.otp_verified_at = new Date();
        updated = true;
      }

      // Optionally reset password if loginId/password are provided and match the existing user's loginId
      if (
        superAdminLoginId &&
        superAdminPassword &&
        saUser.loginId === superAdminLoginId
      ) {
        // WARNING: Uncommenting below will RESET the SA password on every core seed if loginId matches.
        // saUser.password = superAdminPassword;
        // updated = true;
      }
      // Ensure SA does not have belongs_to set
      if (saUser.belongs_to !== null) {
        saUser.belongs_to = null;
        updated = true;
      }

      if (updated) {
        await saUser.save();
        console.log(
          `Updated existing SuperAdmin user (${saUser.loginId || saUser.phone || saUser._id
          })`
        );
      } else {
        console.log(
          `SuperAdmin user (${saUser.loginId || saUser.phone || saUser._id
          }) already exists and is configured.`
        );
      }
    }
    console.log("--- Core Seeding Completed Successfully ---");
  } catch (error) {
    console.error("Error during core seeding process:", error);
    process.exitCode = 1; // Indicate failure
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

seedCoreData();
