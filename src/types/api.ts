// types/api.ts

import { Channel } from "./channel";
import { Plan } from "./plan";
import { UserBasicInfo } from "./user";
import { UserProfile } from "./user"; // Ensure UserProfile is imported
// Standard successful API response structure
export interface ApiResponse<T = any> {
  status: "success";
  results?: number; // Optional: Number of items in 'data' array if applicable
  message?: string; // Optional: Success message (e.g., OTP sent)
  token?: string; // Optional: For login response
  // Data field is optional because some success responses might not have it (e.g., logout, otp request)
  data?: T; // Contains the requested data or object(s)
}

// Standard error API response structure
export interface ApiErrorResponse {
  status: "fail" | "error"; // 'fail' for 4xx, 'error' for 5xx
  message: string;
  error?: any; // Optional: More detailed error object (dev mode)
  stack?: string; // Optional: Stack trace (dev mode)
}

// --- Payload Types (Request Bodies) ---

export interface AuthOtpRequestPayload {
  phone: string;
  role: "User" | "Admin"; // Adjust if other roles can log in via OTP
}

export interface AuthOtpVerifyPayload {
  phone: string;
  otp: string;
  role: string;
}

export interface PasswordLoginPayload {
  loginId: string;
  password: string;
}

export interface SuperAdminLoginPayload {
  loginId: string; // Could be username, email, or even phone if configured on backend
  password: string;
}

export interface CreateAdminUserPayload {
  phone: string;
  name: string;
}

export interface UserKycPayload {
  pan_number: string;
  aadhar_number: string;
  dob: string;
  subid?: string;
}
export interface DOBPayload {
  dob: Date;
}
export interface NameMailPayload {
  name: String;
  email: String
}
export interface UserTelegramPayload {
  telegram_username: string; // Based on frontend plan, verify backend endpoint
  // telegram_id?: number; // If backend expects ID instead
}

export interface TransactionOrderPayload {
  plan_id: string;
  channel_id: string;
  link_slug?: string | null;
  renewal_for_subscription_id?: string;
}

export interface TransactionVerifyPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface SubscriptionUpgradePayload {
  new_plan_id: string;
  action: "renew" | "extend" | "upgrade";
}
export interface SubscriptionCreatePayload {
  new_plan_id: string;
}

export interface ChannelCreatePayload {
  name: string;
  telegram_chat_id: string; // Can be ID or username like @channel
  description?: string | null;
  associated_plan_ids?: string[]; // Send array of plan IDs to associate
  reminder_template_override_id?: string | null;
  reminder_days_override?: number | null;
  is_active?: boolean;
  couponDiscount: number;
  couponCode: string;
}

// For PUT /channels/:id, often the same as Create or a subset
// Using Partial<> makes all fields optional, adjust if some are required for update
export type ChannelUpdatePayload = Partial<ChannelCreatePayload>;

export interface PlanCreatePayload {
  name: string;
  price: number;
  validity_days: number;
  description?: string | null;
  is_active?: boolean; // Default should be true on backend probably
  discounted_price?: number | null; // Allow setting discounted price directly
  channel_id: string; // Required: ID of the channel this plan belongs to
}

// For PUT /plans/:id
// Usually cannot change channel_id via plan update. is_active might be separate endpoint/logic.
export type PlanUpdatePayload = Partial<Omit<PlanCreatePayload, "channel_id">>;

export interface SubscriptionExtendPayload {
  extension_days: number;
}

// No payload needed for standard revoke action (PUT /subscriptions/revoke/:id)
export interface SubscriptionRevokePayload {
  // Empty or define reason if backend requires it
}

export interface AuthContextUserApiResponse {
  id: string;
  phone?: string | null;
  role: string;
  isVerified: boolean;
  isKycSubmitted: boolean;
  telegramIdLinked: boolean;
  name?: string | null; // Added name
  loginId?: string | null; // Added loginId
  team_members?: UserProfile[]; // Add this line for Admin login response
  [key: string]: any;
  email?: string | null;
}

// For POST /auth/otp/verify
export interface AuthOtpVerifyResponse extends ApiResponse {
  token: string;
  data: {
    user: AuthContextUserApiResponse; // Use the shared structure
  };
}

export interface PasswordLoginResponse extends ApiResponse {
  token: string;
  data: {
    user: AuthContextUserApiResponse; // Use the shared structure
  };
}

// Response for Super Admin Login (Assuming structure is same as OTP verify)
export interface SuperAdminLoginResponse extends PasswordLoginResponse { }

export interface CreateAdminUserResponse {
  user: ApiUserMeResponse;
  message: string;
  // Ensure UserMeResponse interface aligns if more fields needed here}
}

// Response for GET /analytics/dashboard-summary
export interface DashboardSummaryResponse {
  totalUsers: number;
  totalAdmins: number;
  totalChannels: number;
  totalActiveChannels: number;
  totalPlans: number;
  totalActivePlans: number;
  totalActiveSubscriptions: number;
  recentRevenue: number; // Assuming a single number for recent period
}
export interface AdminDashboardSummaryResponse {
  totalSubscribers: number;
  avgLifetimeValue: number;
  totalRevenue: number;
  totalRenewals: number;
  dailyRevenue: Array<{ _id: string; revenue: number }>;
  churnRate: number;
  revenueByChannel: Array<{
    channelName: string;
    totalRevenue: number;
  }>;
}

// types/index.ts

export interface DailyRevenueData {
  _id: string;  // Date in string format (e.g., "2024-04-01")
  revenue: number;  // Revenue for that specific day
}

export interface ChannelDashboardSummaryResponse {
  totalRevenue: number;
  totalRenewals: number;
  totalSubscribers: number;
  churnRate: number;
  avgLifetimeValue: number;
  dailyRevenue: Array<{ _id: string; revenue: number }>;
  planContribution: Array<{
    planName: string;
    totalRevenue: number;
  }>;
}

// For GET /users/me
export interface ApiUserMeResponse {
  id: string;
  phone?: string | null; // Use optional chaining if phone can be missing/null
  role: string; // Role name string
  isVerified: boolean;
  isKycSubmitted: boolean;
  kycSubmittedAt?: string | null;
  telegram_username?: string | null;
  telegramIdLinked: boolean;
  createdAt: string;
  name?: string | null; // Added from your backend /me response
  loginId?: string | null; // Include loginId if populated/available
  belongs_to?: string | UserBasicInfo | null; // Potentially populated
}
// UserSubscription defined in subscription.ts

// Renamed from TransactionOrderResponse to clarify its purpose as an *order* response
//Toh lode change kaarna kaar jagah se
export interface InitiateTransactionOrderResponse {
  orderId: string; // Payment gateway Order ID (e.g., Razorpay)
  amount: number; // Amount in smallest currency unit (e.g., paise)
  currency: string; // e.g., INR
  razorpayKeyId: string; // Public Payment Gateway Key
  message?: string;
}
// Renamed SubscriptionUpgradeResponse to use the more general type
export interface SubscriptionUpgradeResponse
  extends InitiateTransactionOrderResponse { }

// For POST /transactions/order
export interface SubscriptionCreateResponse
  extends InitiateTransactionOrderResponse { }

// Removed TransactionOrderResponse to use InitiateTransactionOrderResponse

// For POST /transactions/verify (if needed on frontend)
export interface TransactionVerifyResponse {
  subscriptionId?: string; // The newly created/updated subscription ID
  needsKyc: boolean; // Indicates if user needs to complete KYC
  message?: string; // e.g., "Payment successful, subscription activated."
}

// Response for GET /transactions/:id/invoice
export interface TransactionInvoiceResponse {
  invoiceUrl: string;
}

// Admin/SA Subscription List Response Item
export interface SubscriptionAdminResponse {
  _id: string;
  // id: string;
  // User ID populated with basic info for Admin/SA list view
  user_id: { _id: string; phone?: string | null; name?: string | null; email?: string; aadhar_number?: string | null; pan_number?: string | null; }; // Use basic user info
  plan_id: string | Plan; // Plan might be populated with name/details
  channel_id: string | Channel; // Channel might be populated with name
  start_date: string;
  end_date: string;
  status: "active" | "expired" | "revoked" | "pending";
  createdAt: string;
  updatedAt: string;
  user_phone?: string | null; // Convenience field for display
  plan_name?: string; // Convenience field for display
  channel_name?: string; // Convenience field for display
}
// Admin/SA Transaction List Response Item
export interface TransactionAdminResponse {
  _id: string;
  subscription_id: string | null | { status: "active" | "expired" | "revoked" | "pending", end_date: string; };
  // User ID populated with basic info for Admin/SA list view
  user_id: { _id: string; phone?: string | null; name?: string | null; email?: string }; // Use basic user info
  plan_id: string | Plan; // Plan might be populated with name/details
  channel_id: string | Channel;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  createdAt: string;
  type: "created" | "upgrade" | "expired",
  amount: number
}

// Reminder Templates list item
export interface ReminderTemplate {
  _id: string; // Use _id
  id?: string; // Virtual ID if needed
  name: string;
  content: string;
  type: "pre-expiry" | "custom";
  days_before_expiry?: number | null; // Can be null for custom
  is_default: boolean;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define types for lists where backend returns total count
export interface ListResponseWithTotal<T> extends ApiResponse {
  results: number; // Number of items on current page
  total: number; // Total number of items matching filters
  data: {
    [key: string]: T[]; // e.g., { users: UserProfile[] }
  };
}
