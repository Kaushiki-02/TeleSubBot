// types/auth.ts
import { UserProfile } from "./user"; // Import UserProfile
import { AuthContextUserApiResponse } from "./api";
// This ensures only necessary fields are kept in global state for efficiency and clarity.
export interface AuthContextUser
  extends Pick<
    UserProfile,
    "id" | "phone" | "isKycSubmitted" | "telegramIdLinked" | "loginId" | "name" | "email"
  > {
  role: string;
  role_id?: string;
  team_members?: UserProfile[]; // Add this line
}

// Represents the state managed by AuthContext
export interface AuthState {
  isAuthenticated: boolean;
  // User can be AuthContextUser or null
  user: AuthContextUser | null;
  token: string | null;
  isLoading: boolean; // Indicates if the initial auth check is in progress
}

// Defines the shape of the AuthContext, including state and actions
export interface AuthContextType extends AuthState {
  // The login function receives the full UserProfile object from verifyOtp
  // but we assert/treat it as AuthContextUser when storing it in state
  login: (token: string, userApiData: AuthContextUserApiResponse) => void;
  logout: () => Promise<void>; // Logout might involve async operations (API call)
  checkAuth: () => Promise<void>; // Function to potentially re-verify token with backend
  updateAuthUser: (userData: Partial<AuthContextUser>) => void;
}
