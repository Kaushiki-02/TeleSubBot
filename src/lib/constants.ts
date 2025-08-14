// lib/constants.ts

export const FRONTEND_BASE_URL = "http://13.233.144.61:5001/api/v1";
export const API_BASE_URL =
  FRONTEND_BASE_URL + "/api/v1";
// "http://localhost:5001/api/v1";

export const ROLES = {
  USER: "User",
  ADMIN: "Admin",
  SUPER_ADMIN: "SuperAdmin",
  SALES: "Sales",
  SUPPORT: "Support",
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  USER_ROLE: "userRole",
  IS_KYC_SUBMITTED: "isKycSubmitted",
  REDIRECT_AFTER_LOGIN: "redirectAfterLogin",
  USER_PHONE: "userPhone",
  TELEGRAM_ID_LINKED: "telegramIdLinked",
  USER_LOGIN_ID: "userLoginId", // Added Login ID to storage keys
  USER_NAME: "userName", // Added User Name to storage keys
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  REVOKED: "revoked",
  PENDING: "pending", // If applicable
  GETKYC: "kycSub",
};

export const ROUTES = {
  HOME: "/",
  LOGIN_USER: "/login",
  LOGIN_ADMIN: "/login/admin",
  VERIFY_OTP: "/verify-otp",
  NAME_MAIL_LINK: (role: string) => `/nameMail?role=${role}`,

  USER_DASHBOARD: "/user/my-groups",
  USER_PROFILE: "/user/profile",

  ADMIN_DASHBOARD: "/admin/overview", // Assuming Admin dashboard is the channel list
  ADMIN_CHANNELS: "/admin/channels",
  ADMIN_LEADS: "/admin/leads",
  ADMIN_PROFILE: "/admin/profile", // Admin profile page
  ADMIN_MY_TEAM: "/admin/my-team", // Admin team view
  ADMIN_CHANNEL_EDIT: (id: string) => `/admin/channels/${id}/edit`,
  ADMIN_CHANNEL_SUBS: (id: string) => `/admin/channels/${id}/subscriptions`, // Admin view of channel subs
  ADMIN_CHANNEL_PLANS: (id: string) => `/admin/channels/${id}/plans`, // Admin view of channel plans
  ADMIN_CHANNEL_OVERVIEW: (id: string) => `/admin/channels/${id}/overview`, // Admin view of channel plans

  ADMIN_PLANS_NEW: "/admin/plans/new",
  ADMIN_PLAN_EDIT: (planId: string) => `/admin/plans/${planId}/edit`,

  SUPER_ADMIN_DASHBOARD: "/superadmin/overview", // SuperAdmin dashboard
  SUPER_ADMIN_USERS: "/superadmin/users", // SuperAdmin user management
  SUPER_ADMIN_TEAM: "/superadmin/teams", // SuperAdmin user management
  SUPER_ADMIN_CHANNELS: "/superadmin/channels", // SuperAdmin channel management
  SUPER_ADMIN_PLANS: "/superadmin/plans", // SuperAdmin plan management (repurposed)
  SUPER_ADMIN_SUBSCRIPTIONS: "/superadmin/subscriptions", // Added SuperAdmin subscription list
  SUPER_ADMIN_ROLES: "/superadmin/roles",
  SUPER_ADMIN_SETTINGS: "/superadmin/settings",
  SUPER_ADMIN_LOGS: "/superadmin/logs",
  SUPER_ADMIN_FORGOT: "/superadmin/forgot",

  PUBLIC_CHANNEL_PLANS: (referralCode: string) => `/channel/${referralCode}`,
};
