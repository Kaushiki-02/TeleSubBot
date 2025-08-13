// app/(user)/layout.tsx

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";

import LoadingIndicator from "../../components/ui/LoadingIndicator";
import Header from "../../components/layout/Header";
import Sidebar from "../../components/layout/Sidebar";
import KycPromptModal from "../../components/user/KycPromptModal";
import { ROLES, ROUTES } from "../../lib/constants";

import { faListAlt, faUserEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function UserLayout() {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const router = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setIsKycModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== ROLES.USER) {
        console.log(
          "UserLayout: Auth check failed or role mismatch. Redirecting to user login."
        );
        router(ROUTES.LOGIN_USER, { replace: true });
      } else {
        console.log("UserLayout: User authenticated.");
        // Optional: Redirect authenticated users from login/register pages if they land there
        if (location.pathname === ROUTES.LOGIN_USER) {
          console.log(
            "UserLayout: Authenticated user on login/register, redirecting to dashboard."
          );
          router(ROUTES.USER_DASHBOARD, { replace: true });
        }

        if (user && !user.isKycSubmitted) {
          console.log(
            "UserLayout: KYC not submitted, consider showing prompt."
          );
          setIsKycModalOpen(true);
        }
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  const userNavItems = [
    {
      href: ROUTES.USER_DASHBOARD,
      label: "My Subscriptions",
      icon: <FontAwesomeIcon icon={faListAlt} />, // Added icon
      isActiveCheck: (pn: string, hr: string) => pn === hr, // Or startsWith
    },
    {
      href: ROUTES.USER_PROFILE,
      label: "My Profile",
      icon: <FontAwesomeIcon icon={faUserEdit} />, // Added icon
      isActiveCheck: (pathname: string, href: string) =>
        pathname.startsWith(href) ||
        pathname === (ROUTES.USER_PROFILE || "/user/profile"),
    },
  ];

  // Show loading state ONLY while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-primary">
        <LoadingIndicator size="lg" text="Verifying access..." />
      </div>
    );
  }

  // Render layout ONLY if authenticated as User and loading is complete
  if (!isLoading && isAuthenticated && user?.role === ROLES.USER) {
    return (
      <div className="min-h-screen flex bg-dark-primary">
        <Sidebar
          title="User Portal"
          collapsedIcon={<span className="text-2xl font-bold">U</span>}
          headerLink={ROUTES.USER_DASHBOARD}
          menuItems={userNavItems}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLinkClick={() => setIsSidebarOpen(false)}
        />
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title="User Dashboard"
            titleLink={ROUTES.USER_DASHBOARD}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            isAuthenticated={isAuthenticated}
            onLogout={logout}
            profileRoute={ROUTES.USER_PROFILE}
          />
          <main className="flex-grow p-4 md:p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
        <KycPromptModal
          isOpen={false}
          onClose={() => setIsKycModalOpen(false)}
          sub={undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-primary">
      <LoadingIndicator size="lg" text="Redirecting..." />
    </div>
  );
}
