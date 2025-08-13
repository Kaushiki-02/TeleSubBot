// lib/auth.ts
import { LOCAL_STORAGE_KEYS } from "./constants";
import { AuthContextUser } from "../types/auth";

export const storeToken = (token: string): void => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.error("Error storing token in localStorage:", error);
    }
  }
};

export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error("Error retrieving token from localStorage:", error);
      return null;
    }
  }
  return null;
};

export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error("Error removing token from localStorage:", error);
    }
  }
};

// --- MODIFIED: Store more user data fields ---
export const storeUserData = (user: AuthContextUser): void => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER_ID, user.id ?? "");
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER_ROLE, user.role);
      // Store boolean flags as strings
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.IS_KYC_SUBMITTED,
        String(user.isKycSubmitted)
      );
      // Store phone and telegramIdLinked if available
      if (user.phone !== undefined) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER_PHONE, user.phone ?? "");
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_PHONE); // Remove if not provided
      }
      if (user.telegramIdLinked !== undefined) {
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.TELEGRAM_ID_LINKED,
          String(user.telegramIdLinked)
        );
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.TELEGRAM_ID_LINKED); // Remove if not provided
      }
      // Note: We are NOT storing role_id, name, channels, referralCode, loginId, belongs_to here
      // These should be fetched via /users/me if needed beyond initial auth state.
    } catch (error) {
      console.error("Error storing user data in localStorage:", error);
    }
  }
};

// --- MODIFIED: Retrieve more user data fields ---
export const getUserData = (): {
  id: string | null;
  role: string | null;
  isKycSubmitted: boolean | null;
  phone: string | null; // Retrieve phone
  telegramIdLinked: boolean | null; // Retrieve telegram linked status
} => {
  if (typeof window !== "undefined") {
    try {
      const kycStatus = localStorage.getItem(
        LOCAL_STORAGE_KEYS.IS_KYC_SUBMITTED
      );
      const telegramStatus = localStorage.getItem(
        LOCAL_STORAGE_KEYS.TELEGRAM_ID_LINKED
      );
      return {
        id: localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ID),
        role: localStorage.getItem(LOCAL_STORAGE_KEYS.USER_ROLE),
        // Convert stored strings back to boolean, default to null if not found/invalid
        isKycSubmitted:
          kycStatus === "true" ? true : kycStatus === "false" ? false : null,
        phone: localStorage.getItem(LOCAL_STORAGE_KEYS.USER_PHONE), // Retrieve phone
        telegramIdLinked:
          telegramStatus === "true"
            ? true
            : telegramStatus === "false"
            ? false
            : null, // Retrieve telegram status
      };
    } catch (error) {
      console.error("Error retrieving user data from localStorage:", error);
      return {
        id: null,
        role: null,
        isKycSubmitted: null,
        phone: null,
        telegramIdLinked: null,
      }; // Return defaults on error
    }
  }
  // Return defaults if window is undefined (server-side)
  return {
    id: null,
    role: null,
    isKycSubmitted: null,
    phone: null,
    telegramIdLinked: null,
  };
};

// --- MODIFIED: Remove more user data fields ---
export const removeUserData = (): void => {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ID);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ROLE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.IS_KYC_SUBMITTED);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_PHONE); // Remove phone
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TELEGRAM_ID_LINKED); // Remove telegram status
    } catch (error) {
      console.error("Error removing user data from localStorage:", error);
    }
  }
};
// --- END MODIFIED ---

export const storeRedirectUrl = (url: string): void => {
  if (typeof window !== "undefined" && url) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN, url);
      console.log("Stored redirect URL:", url);
    } catch (error) {
      console.error("Error storing redirect URL in localStorage:", error);
    }
  }
};

export const getRedirectUrl = (): string | null => {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
    } catch (error) {
      console.error("Error retrieving redirect URL from localStorage:", error);
      return null;
    }
  }
  return null;
};

export const removeRedirectUrl = (): void => {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
      console.log("Removed redirect URL from localStorage.");
    } catch (error) {
      console.error("Error removing redirect URL from localStorage:", error);
    }
  }
};

export const clearAuthData = (): void => {
  removeToken();
  removeUserData();
};
