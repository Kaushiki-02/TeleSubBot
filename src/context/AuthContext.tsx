// context/AuthContext.tsx

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  getToken,
  storeToken,
  getUserData,
  storeUserData,
  clearAuthData,
  getRedirectUrl,
  removeRedirectUrl,
} from "../lib/auth";
import { AuthContextUserApiResponse } from "../types/api";
import { AuthState, AuthContextType, AuthContextUser } from "../types/auth";
import { useLocation, useNavigate } from "react-router-dom";

import { ROUTES, ROLES } from "../lib/constants";
import { logoutUser } from "../lib/apiClient";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  });

  const location = useLocation();
  const pathname = location.pathname
  const router = useNavigate();
  const loadAuthFromStorage = useCallback(() => {
    console.log("AuthProvider: Checking local storage...");
    const token = getToken();

    const { id, role, isKycSubmitted, phone, telegramIdLinked } = getUserData(); // Load user fields from storage

    // Ensure required fields are present to restore session
    if (
      token &&
      id &&
      role &&
      isKycSubmitted !== null &&
      telegramIdLinked !== null
    ) {
      // console.log("AuthProvider: Found token and user data in storage.", {
      //   id,
      //   role,
      //   isKycSubmitted,
      //   phone,
      //   telegramIdLinked,
      // });

      const userFromStorage: AuthContextUser = {
        id,
        role,
        isKycSubmitted,
        phone: phone || undefined,
        telegramIdLinked: telegramIdLinked ?? false,
        role_id: undefined, // Not reliably available from storage
      };

      setAuthState({
        isAuthenticated: true,
        user: userFromStorage,
        token,
        isLoading: false,
      });
    } else {
      console.log("AuthProvider: No valid auth data found.");
      clearAuthData();
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
    }
  }, []);

  // Load stored auth state on initial client mount
  useEffect(() => {
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  const login = (token: string, userApiData: AuthContextUserApiResponse) => {
    storeToken(token);

    const userForState: AuthContextUser = {
      id: userApiData.id,
      role: userApiData.role,
      isKycSubmitted: userApiData.isKycSubmitted,
      phone: userApiData.phone || undefined,
      telegramIdLinked: userApiData.telegramIdLinked,
      role_id: undefined, // Not consistently returned by API
      name: userApiData.name || undefined,
      team_members: userApiData.team_members || undefined,
      email: userApiData.email || undefined,
    };
    storeUserData(userForState);
    setAuthState({
      isAuthenticated: true,
      user: userForState,
      token,
      isLoading: false,
    });

    if (userForState.role === "User" && (!userForState.email || !userForState.name)) {
      let redirectPath: string = ROUTES.NAME_MAIL_LINK(userForState.role)
      console.log(
        `AuthProvider: Redirecting to name and email: ${redirectPath}`
      );
      router(redirectPath, { replace: true });
    }
    else {
      const redirectUrl = getRedirectUrl();
      if (redirectUrl) {
        console.log(`AuthProvider: Redirecting to stored URL: ${redirectUrl}`);

        window.location.href = redirectUrl;
        removeRedirectUrl();
      } else {
        let redirectPath: string;

        switch (userApiData.role) {
          case ROLES.SUPER_ADMIN:
            redirectPath = ROUTES.SUPER_ADMIN_DASHBOARD;
            break;
          case ROLES.ADMIN:
          case ROLES.SALES:
          case ROLES.SUPPORT:
            redirectPath = ROUTES.ADMIN_DASHBOARD; // Shared admin dashboard fallback
            break;
          case ROLES.USER:
          default:
            redirectPath = ROUTES.USER_DASHBOARD;
            break;
        }

        console.log(
          `AuthProvider: No stored URL, redirecting to default: ${redirectPath}`
        );
        router(redirectPath, { replace: true });

      }
    }

  };

  const logout = useCallback(async () => {
    console.log("AuthProvider: Logging out...");
    const currentAuthToken = authState.token;

    try {
      if (currentAuthToken) {
        await logoutUser();
        console.log("AuthProvider: Logout API call successful.");
      } else {
        console.log("AuthProvider: No token, skipping logout API call.");
      }
    } catch (error) {
      console.error(
        "AuthProvider: Logout API failed, continuing with cleanup."
      );
    } finally {
      setAuthState((prev) => ({
        ...prev,
        isLoading: true,
        isAuthenticated: false,
        user: null,
        token: null,
      }));
      clearAuthData();
      console.log("AuthProvider: Cleared local auth state.");
      setAuthState((prev) => ({ ...prev, isLoading: false }));

      // Determine login page to redirect to based on path prefix
      const currentPathPrefix = pathname?.split("/")[1];

      let redirectLoginRoute = ROUTES.LOGIN_USER;
      if (currentPathPrefix === "admin") {
        redirectLoginRoute = ROUTES.LOGIN_ADMIN;
      } else if (currentPathPrefix === "superadmin") {
        redirectLoginRoute = ROUTES.LOGIN_ADMIN;
      }

      const authPaths = [
        ROUTES.LOGIN_USER,
        ROUTES.LOGIN_ADMIN,
        ROUTES.VERIFY_OTP,
      ];
      if (!authPaths.some((p) => pathname?.startsWith(p))) {
        console.log(
          `AuthProvider: Redirecting to login page: ${redirectLoginRoute}`
        );
        router(redirectLoginRoute);

      } else {
        console.log("AuthProvider: Already on login/auth page, no redirect.");
      }
    }
  }, [router, pathname, authState.token]);

  const checkAuth = useCallback(async () => {
    console.log("AuthProvider: checkAuth called.");
    const token = getToken();
    if (!token) {
      console.log("checkAuth: No token, forcing logout if needed.");
      if (authState.isAuthenticated) {
        await logout();
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
      return;
    }

    console.log("checkAuth: Token found, assuming still valid.");
    if (authState.isLoading) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }

    // Optional: verify token by hitting /users/me (not implemented here).
  }, [authState.isAuthenticated, authState.isLoading, logout, getToken]);

  const updateAuthUser = (userData: Partial<AuthContextUser>) => {
    setAuthState((prev) => {
      if (!prev.user) {
        console.warn("AuthProvider: Cannot update user, user is null.");
        return prev;
      }
      const updatedUser = { ...prev.user, ...userData };
      storeUserData(updatedUser);
      console.log("AuthProvider: Updated localStorage with new user data.");
      return {
        ...prev,
        user: updatedUser,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{ ...authState, login, logout, checkAuth, updateAuthUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
