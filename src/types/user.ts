// Define a basic type for the populated 'belongs_to' field
// This subset is what we expect when 'belongs_to' is populated
export interface UserBasicInfo {
  _id: string;
  loginId?: string | null;
  phone?: string | null; // Admins might not have phone if using loginId
  email?: string | null;
  name?: string | null;
}

// Frontend User Profile type, essentially the same as the API response for now
export interface UserProfile {
  _id: string; // Use _id from Mongoose
  id?: string; // Include virtual 'id' if backend consistently returns it
  phone?: string | null; // Can be null for SuperAdmin, or Admin/Sales/Support using loginId
  role_id: { _id: string; name: string }; // Role can be ID (default) or populated object
  role?: string | null; // Role name
  otp_verified_at?: string | null; // ISO Date string
  last_login_at?: string | null; // ISO Date string
  loginId?: string | null; // Optional: for password-based login users
  isVerified?: boolean | null;

  // KYC Fields
  pan_number?: string | null;
  aadhar_number?: string | null;
  kycSubmittedAt?: string | null; // ISO Date string
  isKycSubmitted: boolean; // Derived boolean for convenience

  // Telegram Fields
  telegram_id?: number | null;
  telegram_username?: string | null;
  telegramIdLinked: boolean; // Derived boolean for convenience

  // Other Fields
  name?: string | null;
  email?: string | null;
  channels: string[]; // Array of Channel IDs (strings)
  referralCode?: string | null; // For users who are also salespeople/channel owners
  dob?: string;
  // Can be null, the string ID, or a populated basic user object
  belongs_to?: string | UserBasicInfo | null | string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Type for KYC form state/data
export interface KycFormData {
  subid?: string | undefined;
  pan_number: string;
  aadhar_number: string;
  dob: string;
}

export interface NameMailFormData {
  name: String;
  email: String
}
export interface DOBFormData {
  dob: Date;
}
// Type for Telegram link form state/data
export interface TelegramFormData {
  telegram_username: string;
}
