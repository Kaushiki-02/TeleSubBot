// test/setup.js
// No changes were needed in this file based on the last error log.
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Role from "../src/models/Role.js";
import Permission from "../src/models/Permission.js";

let mongoServer;

// --- Permissions Data (copy from scripts/seed.js or define here) ---
const permissionsData = [
  { resource: "User", action: "read:own", description: "Read own profile" },
  { resource: "User", action: "update:own", description: "Update own profile/link telegram" },
  { resource: "User", action: "submit:kyc", description: "Submit own KYC" },
  { resource: "User", action: "read:all", description: "Read all user profiles (Admin/Support view)" },
  { resource: "User", action: "read", description: "Read specific user profile (Admin/Support view)" },
  { resource: "User", action: "update:role", description: "Assign role to user (SuperAdmin only)" },
  { resource: "User", action: "export", description: "Export user data (Admin view)" },
  { resource: "Plan", action: "read", description: "Read plans" },
  { resource: "Plan", action: "create", description: "Create plans" },
  { resource: "Plan", action: "update", description: "Update plans" },
  { resource: "Plan", action: "delete", description: "Deactivate plans" },
  { resource: "Channel", action: "read", description: "Read channels" },
  { resource: "Channel", action: "create", description: "Create channels" },
  { resource: "Channel", action: "update", description: "Update channels" },
  { resource: "Channel", action: "delete", description: "Delete channels" },
  { resource: "Link", action: "read:own", description: "Read own links" },
  { resource: "Link", action: "read:all", description: "Read all links (Admin view)" },
  { resource: "Link", action: "read", description: "Read specific link (Admin view)" },
  { resource: "Link", action: "create", description: "Create links (Sales/Admin)" }, 
  { resource: "Link", action: "update:own", description: "Update own links" },
  { resource: "Link", action: "update:all", description: "Update any link (Admin view)" },
  { resource: "Link", action: "delete:own", description: "Delete own links" },
  { resource: "Link", action: "delete:all", description: "Delete any link (Admin view)" },
  { resource: "Link", action: "import", description: "Import links (Admin view)" },
  { resource: "Link", action: "export", description: "Export links (Admin view)" },
  { resource: "Subscription", action: "read:own", description: "Read own subscriptions" },
  { resource: "Subscription", action: "read:all", description: "Read all subscriptions (Admin/Support view)" },
  { resource: "Subscription", action: "read", description: "Read specific subscription (Admin/Support view)" },
  { resource: "Subscription", action: "renew", description: "Initiate own renewal" },
  { resource: "Subscription", action: "upgrade", description: "Initiate own upgrade" },
  { resource: "Subscription", action: "extend", description: "Extend subscription (Support only)" },
  { resource: "Subscription", action: "revoke", description: "Revoke subscription (Admin only)" },
  { resource: "Transaction", action: "read:own", description: "Read own transactions" },
  { resource: "Transaction", action: "read:all", description: "Read all transactions (Admin/Support view)" },
  { resource: "Transaction", action: "read", description: "Read specific transaction (Admin/Support view)" },
  { resource: "Transaction", action: "create:order", description: "Create payment order (User role)" },
  { resource: "Transaction", action: "verify:payment", description: "Verify own payment (User role)" },
  { resource: "Transaction", action: "reconcile", description: "Access reconciliation data (Admin view)" },
  { resource: "Transaction", action: "read:invoice", description: "View invoice (User/Admin/Support)" },
  { resource: "ReminderTemplate", action: "read", description: "Read reminder templates" },
  { resource: "ReminderTemplate", action: "create", description: "Create reminder templates" },
  { resource: "ReminderTemplate", action: "update", description: "Update reminder templates" },
  { resource: "ReminderTemplate", action: "delete", description: "Delete reminder templates" },
  { resource: "Reminder", action: "read", description: "Read delivery reports" },
  { resource: "Analytics", action: "read:revenue", description: "View revenue reports" },
  { resource: "Analytics", action: "read:subscription", description: "View subscription metrics" },
  { resource: "Analytics", action: "read:churn", description: "View churn reports" },
  { resource: "Analytics", action: "read:ltv", description: "View LTV reports" },
  { resource: "Analytics", action: "read:link:own", description: "View own link conversion" },
  { resource: "Analytics", action: "read:link:all", description: "View all link conversion" },
  { resource: "Analytics", action: "export", description: "Export analytics" },
  { resource: "Log", action: "read", description: "Read audit logs" },
  { resource: "Log", action: "export", description: "Export audit logs" },
  { resource: "FAQ", action: "read", description: "Read FAQs (Mgmt)" },
  { resource: "FAQ", action: "manage", description: "Manage FAQs (CUD)" },
  { resource: "Role", action: "read", description: "Read roles" },
  { resource: "Role", action: "create", description: "Create roles" },
  { resource: "Role", action: "update", description: "Update roles" },
  { resource: "Role", action: "delete", description: "Delete roles" },
  { resource: "Role", action: "assign:permissions", description: "Assign permissions to roles" },
  { resource: "Setting", action: "read", description: "Read settings" },
  { resource: "Setting", action: "manage", description: "Manage settings (CUD)" },
];

export const mochaGlobalSetup = async function () {
  this.timeout(30000); // Increase timeout for setup if needed
  console.log("Starting MongoDB Memory Server for tests...");
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  process.env.NODE_ENV = "test";

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
    }
    console.log(`MongoDB Memory Server connected at: ${mongoUri}`);

    console.log("Seeding initial permissions and roles...");
    await Permission.deleteMany({});
    await Role.deleteMany({});

    const createdPermissions = await Permission.insertMany(permissionsData);
    const permMap = new Map(
      createdPermissions.map((p) => [`${p.resource}:${p.action}`, p._id])
    );
    const getPermIds = (keys) =>
      keys.map((key) => {
        const id = permMap.get(key);
        if (!id) console.warn(`Permission key not found: ${key}`);
        return id;
      }).filter((id) => !!id);

    // Define roles with permissions using getPermIds
    const rolesToSeed = [
      {
        name: "SuperAdmin",
        description: "Platform owner with all permissions",
        permissions: getPermIds(permissionsData.map(p => `${p.resource}:${p.action}`)), // All perms
      },
      {
        name: "Admin",
        description: "System operations manager",
        permissions: getPermIds([
          "Plan:read", "Plan:create", "Plan:update", "Plan:delete",
          "Channel:read", "Channel:create", "Channel:update", "Channel:delete",
          "Link:read:all", "Link:read", "Link:create", "Link:update:all", "Link:delete:all", "Link:import", "Link:export",
          "Subscription:read:all", "Subscription:read", "Subscription:revoke",
          "Transaction:read:all", "Transaction:read", "Transaction:reconcile", "Transaction:read:invoice",
          "ReminderTemplate:read", "ReminderTemplate:create", "ReminderTemplate:update", "ReminderTemplate:delete",
          "Reminder:read",
          "Analytics:read:revenue", "Analytics:read:subscription", "Analytics:read:churn", "Analytics:read:ltv", "Analytics:read:link:all", "Analytics:export",
          "FAQ:read", "FAQ:manage",
          "User:read:all", "User:read", "User:export",
          "Setting:read",
        ]),
      },
      {
        name: "Sales",
        description: "Lead generation and link management",
        permissions: getPermIds([
          "User:read:own",
          "Link:read:own", "Link:read", "Link:create", "Link:update:own", "Link:delete:own",
          "Analytics:read:link:own",
          "Channel:read",
          "Plan:read",
        ]),
      },
      {
        name: "Support",
        description: "Subscriber assistance and issue resolution",
        permissions: getPermIds([
          "User:read:own", "User:read:all", "User:read",
          "Subscription:read:all", "Subscription:read", "Subscription:extend",
          "Transaction:read:all", "Transaction:read", "Transaction:read:invoice",
          "Channel:read",
          "Plan:read",
          "FAQ:read",
        ]),
      },
      {
        name: "User",
        description: "Standard subscriber with self-service capabilities",
        permissions: getPermIds([
          "User:read:own", "User:update:own", "User:submit:kyc",
          "Subscription:read:own", "Subscription:renew", "Subscription:upgrade",
          "Transaction:read:own", "Transaction:create:order", "Transaction:verify:payment", "Transaction:read:invoice",
        ]),
      },
    ];

    await Role.insertMany(rolesToSeed);
    console.log("Permissions and Roles seeded.");

  } catch (err) {
    console.error("Error during global test setup:", err);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) await mongoServer.stop();
    process.exit(1);
  }
};

export const mochaGlobalTeardown = async function () {
  // Using async function
  console.log("Disconnecting MongoDB Memory Server...");
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    console.log("MongoDB Memory Server stopped.");
  }
};
