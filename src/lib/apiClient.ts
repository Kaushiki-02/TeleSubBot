// lib/apiClient.ts
import axios, { AxiosError } from "axios";
import { getToken, clearAuthData } from "./auth";
import { API_BASE_URL, ROUTES } from "./constants";
import { getErrorMessage } from "./utils";
import {
  ApiErrorResponse,
  ApiResponse,
  AuthOtpRequestPayload,
  AuthOtpVerifyPayload,
  AuthOtpVerifyResponse,
  UserKycPayload,
  UserTelegramPayload,
  UserProfile,
  UserSubscription,
  Channel,
  Plan,
  InitiateTransactionOrderResponse,
  SubscriptionUpgradePayload,
  ChannelCreatePayload,
  ChannelUpdatePayload,
  PopulatedChannel,
  SubscriptionAdminResponse,
  SubscriptionExtendPayload,
  PlanCreatePayload,
  PlanUpdatePayload,
  ReminderTemplate,
  PasswordLoginPayload,
  PasswordLoginResponse,
  DashboardSummaryResponse,
  ListResponseWithTotal,
  DOBPayload,
  AdminDashboardSummaryResponse,
  ChannelDashboardSummaryResponse,
  NameMailPayload,
  TransactionAdminResponse,
} from "../types";

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor to add token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling (like 401)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      console.error(
        "API Error: Unauthorized (401). Clearing auth data and redirecting."
      );
      clearAuthData();
      if (typeof window !== "undefined") {
        let loginRoute = ROUTES.LOGIN_USER; // Default
        if (window.location.pathname.startsWith("/admin")) {
          loginRoute = ROUTES.LOGIN_ADMIN;
        } else if (window.location.pathname.startsWith("/superadmin")) {
          loginRoute = ROUTES.LOGIN_ADMIN;
        }

        const authPaths = [
          ROUTES.LOGIN_USER,
          ROUTES.LOGIN_ADMIN,
          ROUTES.VERIFY_OTP,
        ];
        if (!authPaths.some((p) => window.location.pathname.startsWith(p))) {
          console.log(`Redirecting to ${loginRoute} due to 401`);
          window.location.href = loginRoute;
        } else {
          console.log(
            "Already on auth page or window undefined, skipping redirect."
          );
        }
      }
    }
    const errorMessage = getErrorMessage(error);
    return Promise.reject(new Error(errorMessage));
  }
);

// Helper to extract data or throw error message string
const handleApiResponse = <T>(response: {
  data: ApiResponse<T> | ApiErrorResponse;
  status: number;
}): T => {
  // Handle 204 explicitly (no content)
  if (response.status === 204) {
    return undefined as T;
  }
  if ('status' in response.data && response.data.status === "success") {
    if ("data" in response.data && response.data.data !== undefined) {
      return response.data.data as T;
    }
    return undefined as T;
  } else {
    throw new Error(
      (response.data as ApiErrorResponse).message ||
      "API request failed with non-success status"
    );
  }
};


// Helper to handle list responses with total count
// helper: now keyed return
const handleListResponseWithTotal = <T, K extends string>(
  response: { data: ListResponseWithTotal<{}> | ApiErrorResponse },
  key: K
): { [P in K]: T[] } & { total: number } => {
  if (response.data.status !== "success") {
    throw new Error((response.data as ApiErrorResponse).message);
  }
  const list = response.data as ListResponseWithTotal<{}>;
  const arr = list.data?.[key] as T[] | undefined;
  if (!Array.isArray(arr)) {
    throw new Error(`Expected data.${key} to be array`);
  }
  return { [key]: arr, total: list.total ?? arr.length } as any;
};

// --- Auth ---
export const requestOtp = async (
  payload: AuthOtpRequestPayload
): Promise<ApiResponse> => {
  const response = await axiosInstance.post<ApiResponse | ApiErrorResponse>(
    "/auth/otp/request",
    payload
  );
  if (response.data.status !== "success") {
    throw new Error(
      (response.data as ApiErrorResponse).message || "Failed to send OTP"
    );
  }
  return response.data as ApiResponse;
};

export const verifyOtp = async (
  payload: AuthOtpVerifyPayload
): Promise<AuthOtpVerifyResponse> => {
  const response = await axiosInstance.post<
    AuthOtpVerifyResponse | ApiErrorResponse
  >("/auth/otp/verify", payload);
  // Ensure all expected user fields from backend are checked
  // Using the specific AuthContextUserApiResponse type for checking
  const userData = (response.data as AuthOtpVerifyResponse).data?.user;
  if (
    response.data.status === "success" &&
    "token" in response.data &&
    userData?.id &&
    userData.role &&
    userData.isKycSubmitted !== undefined &&
    userData.telegramIdLinked !== undefined
  ) {
    return response.data as AuthOtpVerifyResponse;
  }
  throw new Error(
    (response.data as ApiErrorResponse).message ||
    "OTP Verification failed or returned invalid data."
  );
};

export const loginPassword = async (
  payload: PasswordLoginPayload
): Promise<PasswordLoginResponse> => {
  // --- NEW FUNCTION ---
  const response = await axiosInstance.post<
    PasswordLoginResponse | ApiErrorResponse
  >("/auth/login/password", payload);
  // Using the specific AuthContextUserApiResponse type for checking
  const userData = (response.data as PasswordLoginResponse).data?.user;
  if (
    response.data.status === "success" &&
    "token" in response.data &&
    userData?.id &&
    userData.role &&
    userData.isKycSubmitted !== undefined &&
    userData.telegramIdLinked !== undefined
  ) {
    return response.data as PasswordLoginResponse;
  }
  throw new Error(
    (response.data as ApiErrorResponse).message ||
    "Password Login failed or returned invalid data."
  );
};

export const logoutUser = async (): Promise<void> => {
  try {
    await axiosInstance.post("/auth/logout");
  } catch (error) {
    console.error(
      "Error calling logout API (ignoring for local logout):",
      getErrorMessage(error)
    );
  } finally {
    clearAuthData();
  }
};

// --- User ---
export const getUserProfile = async (): Promise<UserProfile> => {
  // Expecting { status: 'success', data: { user: UserProfile } }
  const response = await axiosInstance.get<
    ApiResponse<{ user: UserProfile }> | ApiErrorResponse
  >("/users/me");
  const data = handleApiResponse(response);
  if (!data?.user) {
    throw new Error("User data not found in API response.");
  }
  return data.user;
};
export const submitdob = async (payload: DOBPayload): Promise<void> => {
  const response = await axiosInstance.post<
    ApiResponse<void> | ApiErrorResponse
  >("/users/dob", payload);
  return handleApiResponse(response);
};
export const submitnamemail = async (payload: NameMailPayload): Promise<void> => {
  const response = await axiosInstance.post<
    ApiResponse<void> | ApiErrorResponse
  >("/users/namemail", payload);
  return handleApiResponse(response);
};
export const submitKyc = async (
  payload: UserKycPayload
): Promise<{ kycSubmittedAt: string }> => {
  const response = await axiosInstance.post<
    ApiResponse<{ kycSubmittedAt: string }> | ApiErrorResponse
  >("/users/kyc", payload);
  return handleApiResponse(response);
};
export const submitKycsub = async (
  payload: UserKycPayload
): Promise<{ kycSubmittedAt: string }> => {
  const response = await axiosInstance.post<
    ApiResponse<{ kycSubmittedAt: string }>
  >("/users/kyc/sub", payload);
  return handleApiResponse(response);
};
export const linkTelegramUsername = async (
  payload: UserTelegramPayload
): Promise<void> => {
  const response = await axiosInstance.post<ApiResponse>(
    "/users/me/telegram",
    payload
  );
  handleApiResponse(response);
};

// --- Subscriptions (User) ---
export const getUserSubscriptions = async (): Promise<UserSubscription[]> => {
  // Expecting { status: 'success', results?: number, data: { subscriptions: UserSubscription[] } }
  const response = await axiosInstance.get<
    ApiResponse<{ subscriptions: UserSubscription[] }> | ApiErrorResponse
  >("/subscriptions/my-groups");
  const data = handleApiResponse(response);
  return data?.subscriptions || []; // Return empty array if data or subscriptions is missing
};

// --- NewSub Flow ---
// Using the shared InitiateTransactionOrderResponse type
export const initiateSubscribe = async (payload: {
  plan_id: string;
  referral_code?: string;
  couponCode?: string;
}): Promise<InitiateTransactionOrderResponse> => {
  const response = await axiosInstance.post<
    ApiResponse<InitiateTransactionOrderResponse> | ApiErrorResponse
  >(`/transactions/order`, payload);
  return handleApiResponse(response);
};

// --- Upgrade Flow ---
// Using the shared InitiateTransactionOrderResponse type
export const initiateUpgrade = async (
  subscriptionId: string,
  payload: SubscriptionUpgradePayload
): Promise<InitiateTransactionOrderResponse> => {
  // --- MODIFIED RETURN TYPE ---
  const response = await axiosInstance.post<
    ApiResponse<InitiateTransactionOrderResponse> | ApiErrorResponse
  >(`/subscriptions/upgrade/${subscriptionId}`, payload);
  return handleApiResponse(response);
};

// --- Transactions (User) ---
export const getTransactionInvoice = async (
  transactionId: string
): Promise<{ invoiceUrl: string }> => {
  // --- MODIFIED RETURN TYPE - always returns object or throws ---
  try {
    const response = await axiosInstance.get<
      ApiResponse<{ invoiceUrl: string }> | ApiErrorResponse
    >(`/transactions/${transactionId}/invoice`);
    const data = handleApiResponse(response);

    if (data?.invoiceUrl) {
      return data;
    } else {
      // API returned success but no invoiceUrl, treat as not found/unavailable operationally
      // throw new Error('Invoice URL not found in successful response.'); // Or handle as specific AppError like backend
      const errorMsg =
        (response.data as ApiErrorResponse)?.message ||
        "Invoice URL not found in response.";
      throw new Error(errorMsg); // Throw the message from backend error if available
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    if (
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("not available") ||
      message.toLowerCase().includes("no invoice available")
    ) {
      throw new Error("Invoice not available or ready.");
    }

    console.error("Error fetching invoice:", message);
    throw new Error(message || "Failed to fetch invoice.");
  }
};

// --- Public Channel & Plan Access ---
export const getPublicChannelByReferralCode = async (
  referralCode: string
): Promise<PopulatedChannel> => {
  // Expecting { status: 'success', data: { channel: PopulatedChannel } }
  const response = await axiosInstance.get<
    ApiResponse<{ channel: PopulatedChannel }> | ApiErrorResponse
  >(`/channels/public/${referralCode}`);
  const data = handleApiResponse(response);
  const channelData = data?.channel;
  if (!channelData) {
    throw new Error("Channel not found or is inactive.");
  }
  return channelData;
};

// --- Channels (Used by Admin/SA - Backend filters results) ---
export const getChannelDetails = async (
  channelId: string
): Promise<PopulatedChannel> => {
  // Expecting { status: 'success', data: { channel: PopulatedChannel } }
  const response = await axiosInstance.get<
    ApiResponse<{ channel: PopulatedChannel }> | ApiErrorResponse
  >(`/channels/${channelId}`);
  const data = handleApiResponse(response);
  const channelData = data?.channel;
  if (!channelData) {
    throw new Error("Channel data not found in API response.");
  }
  return channelData;
};

// --- ADMIN / SUPER ADMIN API Calls ---

// --- Dashboard ---
export const getDashboardSummary =
  async (): Promise<DashboardSummaryResponse> => {
    // Expecting { status: 'success', data: DashboardSummaryResponse }
    const response = await axiosInstance.get<
      ApiResponse<DashboardSummaryResponse> | ApiErrorResponse
    >("/analytics/dashboard-summary");
    return handleApiResponse(response);
  };

export async function getAdminDashboardSummary(
  startDate: string,
  endDate: string,
  aggregation: "mon" | "yer" | "day" | "none",
  year: number,
  month: number,
): Promise<AdminDashboardSummaryResponse> {
  const response = await axiosInstance.post("/analytics/admin/dashboard", {
    start_date: startDate,
    end_date: endDate,
    aggregation,
    year,
    month
  });
  return response.data;
}
export async function getChannelDashboardSummary(
  channelId: string,
  startDate: string | Date,
  endDate: string | Date,
  aggregation: "mon" | "yer" | "day" | "none",
  year: number,
  month: number,
  planId?: string,
): Promise<ChannelDashboardSummaryResponse> {
  const response = await axiosInstance.post(
    "/analytics/admin/channel/dashboard",
    {
      channel_id: channelId,
      start_date: startDate,
      aggregation,
      year,
      month,
      end_date: endDate,
      ...(planId && { plan_id: planId }), // include only if defined
    }
  );

  return response.data;
}

// --- Users ---
// Fetches users. Backend controller logic filters based on role (SA sees all, Admin sees theirs)
export const getUsersList = async (
  filters: { phone?: string; role?: string; page?: number; limit?: number } = {}
): Promise<{ users: UserProfile[]; total: number }> => {
  // --- MODIFIED RETURN TYPE ---
  // Expecting { status: 'success', results: number, total: number, data: { users: UserProfile[] } }
  const response = await axiosInstance.get<
    ListResponseWithTotal<{ users: UserProfile }> | ApiErrorResponse
  >("/users", { params: filters });
  // Use the helper to handle list responses with total
  return handleListResponseWithTotal(response, "users");
};

// SuperAdmin specific: Create Admin User
export const createRoleUser = async (payload: {
  loginId: string;
  password?: string;
  name: string;
  roleName: string;
  belongs_to?: string;
}): Promise<{ user: UserProfile; message: string }> => {
  // Backend returns UserProfile in 'user' field
  const response = await axiosInstance.post<
    ApiResponse<{ user: UserProfile; message: string }> | ApiErrorResponse
  >("/users/create-role-user", payload);
  return handleApiResponse(response); // This expects data.data
};
// SuperAdmin specific: Update User
export const updateRoleUser = async (payload: {
  loginId: string;
  password: string;
}): Promise<{ message: string }> => {
  // Backend returns UserProfile in 'user' field
  const response = await axiosInstance.post<
    ApiResponse<{ message: string }> | ApiErrorResponse
  >("/users/update-role-user", payload);
  return handleApiResponse(response); // This expects data.data
};

// --- Channels ---
// Fetches channels. Backend controller filters based on role (SA sees all + owner, Admin sees owned)
// Currently backend getAllChannels for SA returns channels with populated owner but ASSOCIATED_PLAN_IDS as strings.
// The frontend SA Channels page will now need populated plans, so this endpoint needs to return PopulatedChannel[].
export const getAdminChannels = async (
  filters: {
    name?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<PopulatedChannel[]> => {
  // --- MODIFIED RETURN TYPE ---
  // Expecting { status: 'success', results: number, data: { channels: PopulatedChannel[] } } (for SA)
  const response = await axiosInstance.get<
    ApiResponse<{ channels: PopulatedChannel[] }> | ApiErrorResponse
  >("/channels", { params: filters });
  const data = handleApiResponse(response);
  return data?.channels || [];
};

// ... createAdminChannel ...
export const createAdminChannel = async (
  payload: ChannelCreatePayload
): Promise<Channel> => {
  // Expecting { status: 'success', data: { channel: Channel } }
  const response = await axiosInstance.post<
    ApiResponse<{ channel: Channel }> | ApiErrorResponse
  >("/channels", payload);
  const data = handleApiResponse(response);
  if (!data?.channel) throw new Error("Channel data not found in response.");
  return data.channel;
};

// ... updateAdminChannel ...
export const updateAdminChannel = async (
  channelId: string,
  payload: ChannelUpdatePayload
): Promise<Channel> => {
  // Expecting { status: 'success', data: { channel: Channel } }
  const response = await axiosInstance.put<
    ApiResponse<{ channel: Channel }> | ApiErrorResponse
  >(`/channels/${channelId}`, payload);
  const data = handleApiResponse(response);
  if (!data?.channel) throw new Error("Channel data not found in response.");
  return data.channel;
};

// ... deleteAdminChannel ...
export const deleteAdminChannel = async (channelId: string): Promise<void> => {
  try {
    // Expecting 204 No Content or 200 with success status and no data
    const response = await axiosInstance.delete<ApiResponse | ApiErrorResponse>(
      `/channels/${channelId}`
    );
    console.log(response);
    handleApiResponse(response);

    return; // Return void on success
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error));
  }
};

// ... activateAdminChannel ...
export const activateAdminChannel = async (
  channelId: string
): Promise<Channel> => {
  // Expecting { status: 'success', message: '...', data: { channel: Channel } }
  const response = await axiosInstance.put<
    ApiResponse<{ channel: Channel }> | ApiErrorResponse
  >(`/channels/${channelId}/activate`);
  const data = handleApiResponse(response);
  if (!data?.channel) throw new Error("Channel data not found in response.");
  return data.channel;
};

// ... deactivateAdminChannel ...
export const deactivateAdminChannel = async (
  channelId: string
): Promise<Channel> => {
  // Expecting { status: 'success', message: '...', data: { channel: Channel } }
  const response = await axiosInstance.put<
    ApiResponse<{ channel: Channel }> | ApiErrorResponse
  >(`/channels/${channelId}/deactivate`);
  const data = handleApiResponse(response);
  if (!data?.channel) throw new Error("Channel data not found in response.");
  return data.channel;
};

// --- Plans ---
// Fetches plans. Backend controller filters based on role (SA sees all + channel/owner, Admin sees plans for owned channels)
// SA view needs channel/owner populated.
export const getAdminPlans = async (
  filters: {
    name?: string;
    channel?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<Plan[]> => {
  // --- MODIFIED RETURN TYPE ---
  // Expecting { status: 'success', results: number, data: { plans: Plan[] } } (with channel_id populated for SA)
  const response = await axiosInstance.get<
    ApiResponse<{ plans: Plan[] }> | ApiErrorResponse
  >("/plans", { params: filters });
  const data = handleApiResponse(response);
  return data?.plans || [];
};

// ... getPlansForChannel ...
export const getPlansForChannel = async (
  channelId: string
): Promise<Plan[]> => {
  // Expecting { status: 'success', results: number, data: { plans: Plan[] } } (where plans have channel_id as string/basic object)
  const response = await axiosInstance.get<
    ApiResponse<{ plans: Plan[] }> | ApiErrorResponse
  >(`/plans/channel/${channelId}`);
  const data = handleApiResponse(response);
  return data?.plans || [];
};

// Delete Plan (Hard Delete)
// Just remove the plan document AND the association.
export const deleteAdminPlan = async (planId: string): Promise<void> => {
  // --- RENAMED, MODIFIED RETURN TYPE ---
  try {
    // Expecting success status or 200/204
    const response = await axiosInstance.delete<ApiResponse | ApiErrorResponse>(
      `/plans/${planId}`
    );
    handleApiResponse(response);
    return; // Return void on success
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error));
  }
};

// ... getPlanDetails ...
export const getPlanDetails = async (planId: string): Promise<Plan> => {
  // Expecting { status: 'success', data: { plan: Plan } } (with channel_id populated for SA)
  const response = await axiosInstance.get<
    ApiResponse<{ plan: Plan }> | ApiErrorResponse
  >(`/plans/${planId}`);
  const data = handleApiResponse(response);
  const planData = data?.plan;
  if (!planData) {
    throw new Error("Plan data not found in API response.");
  }
  return planData;
};

// ... createAdminPlan ...
export const createAdminPlan = async (
  payload: PlanCreatePayload
): Promise<Plan> => {
  // Expecting { status: 'success', data: { plan: Plan } }
  const response = await axiosInstance.post<
    ApiResponse<{ plan: Plan }> | ApiErrorResponse
  >("/plans", payload);
  const data = handleApiResponse(response);
  if (!data?.plan) throw new Error("Plan data not found in response.");
  return data.plan;
};

// ... updateAdminPlan ...
export const updateAdminPlan = async (
  planId: string,
  payload: PlanUpdatePayload
): Promise<Plan> => {
  // Expecting { status: 'success', data: { plan: Plan } }
  const response = await axiosInstance.put<
    ApiResponse<{ plan: Plan }> | ApiErrorResponse
  >(`/plans/${planId}`, payload);
  const data = handleApiResponse(response);
  if (!data?.plan) throw new Error("Plan data not found in response.");
  return data.plan;
};

// ... activateAdminPlan ...
export const activateAdminPlan = async (planId: string): Promise<Plan> => {
  // Expecting { status: 'success', message: '...', data: { plan: Plan } }
  const response = await axiosInstance.put<
    ApiResponse<{ plan: Plan }> | ApiErrorResponse
  >(`/plans/${planId}/activate`);
  const data = handleApiResponse(response);
  if (!data?.plan) throw new Error("Plan data not found in response.");
  return data.plan;
};

// ... deactivateAdminPlan ...
export const deactivateAdminPlan = async (planId: string): Promise<Plan> => {
  // Expecting { status: 'success', message: '...', data: { plan: Plan } }
  const response = await axiosInstance.put<
    ApiResponse<{ plan: Plan }> | ApiErrorResponse
  >(`/plans/${planId}/deactivate`);
  const data = handleApiResponse(response);
  if (!data?.plan) throw new Error("Plan data not found in response.");
  return data.plan;
};

// Subscriptions (Admin/SA - backend handles filtering)

// Uses SubscriptionAdminResponse type which expects user_id populated with basic info.
export const getAdminChannelSubscriptions = async (
  channelId: string,
  filters: {
    userPhone?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ subscriptions: SubscriptionAdminResponse[]; total: number }> => {
  // --- MODIFIED RETURN TYPE ---
  const params = { ...filters, channel_id: channelId };
  // Expecting { status: 'success', results: number, total: number, data: { subscriptions: SubscriptionAdminResponse[] } }
  const response = await axiosInstance.get<
    | ListResponseWithTotal<{ subscriptions: SubscriptionAdminResponse }>
    | ApiErrorResponse
  >("/subscriptions", { params });
  // Helper to handle list responses with total
  return handleListResponseWithTotal(response, "subscriptions");
};
export const getAdminChannelLeads = async (
  channelId?: string,
): Promise<{ transactions: TransactionAdminResponse[]; total: number }> => {
  // --- MODIFIED RETURN TYPE ---
  const params = channelId && { channel_id: channelId };
  // Expecting { status: 'success', results: number, total: number, data: { subscriptions: SubscriptionAdminResponse[] } }
  const response = await axiosInstance.get<
    | ListResponseWithTotal<{ transactions: TransactionAdminResponse }>
    | ApiErrorResponse
  >("/transactions/incomplete", { params });

  // Helper to handle list responses with total
  return handleListResponseWithTotal(response, "transactions");
};
// Extend Subscription (Used by Support/Admin/SA - backend checks permissions)
export const extendSubscription = async (
  subId: string,
  payload: SubscriptionExtendPayload
): Promise<SubscriptionAdminResponse> => {
  // Expecting { status: 'success', message: '...', data: { subscription: SubscriptionAdminResponse } }
  const response = await axiosInstance.put<
    ApiResponse<{ subscription: SubscriptionAdminResponse }> | ApiErrorResponse
  >(`/subscriptions/extend/${subId}`, payload);
  const data = handleApiResponse(response);
  if (!data?.subscription)
    throw new Error("Subscription data not found in response.");
  return data.subscription;
};

// Revoke Subscription (Used by Admin/SA - backend checks permissions)
export const revokeSubscription = async (subId: string): Promise<void> => {
  try {
    // Expecting success status or 200/204
    const response = await axiosInstance.put<ApiResponse | ApiErrorResponse>(
      `/subscriptions/revoke/${subId}`
    );
    handleApiResponse(response);
    return;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error));
  }
};

// Reminder Templates (Read-only for Form Selection)
export const getReminderTemplates = async (): Promise<ReminderTemplate[]> => {
  // Expecting { status: 'success', results?: number, data: { templates: ReminderTemplate[] } }
  const response = await axiosInstance.get<
    ApiResponse<{ templates: ReminderTemplate[] }> | ApiErrorResponse
  >("/reminders/templates");
  const data = handleApiResponse(response);
  return data?.templates || [];
};
