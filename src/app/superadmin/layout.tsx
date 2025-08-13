// app/(superadmin)/layout.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Outlet } from "react-router-dom";
import LoadingIndicator from "../../components/ui/LoadingIndicator";
import Header from "../../components/layout/Header";
import Sidebar from "../../components/layout/Sidebar";
import { ROLES, ROUTES } from "../../lib/constants";

import {
  faTachometerAlt,
  faUsers,
  faList,
  faDollarSign,
  faPeopleGroup,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function SuperAdminLayout() {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const router = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== ROLES.SUPER_ADMIN) {
        console.log(
          "SuperAdminLayout: Auth check failed or role mismatch. Redirecting to super admin login."
        );
        router(ROUTES.LOGIN_ADMIN, { replace: true });
      } else {
        console.log("SuperAdminLayout: Super Admin authenticated.");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  const superAdminNavItems = [
    {
      href: ROUTES.SUPER_ADMIN_DASHBOARD,
      label: "Dashboard",
      icon: <FontAwesomeIcon icon={faTachometerAlt} />,
      isActiveCheck: (pn: string, hr: string) => pn === hr,
    },
    {
      href: ROUTES.SUPER_ADMIN_USERS,
      label: "Users",
      icon: <FontAwesomeIcon icon={faUsers} />,
    },
    {
      href: ROUTES.SUPER_ADMIN_TEAM,
      label: "Teams",
      icon: <FontAwesomeIcon icon={faPeopleGroup} />,
    },
    {
      href: ROUTES.SUPER_ADMIN_CHANNELS,
      label: "Channels",
      icon: <FontAwesomeIcon icon={faList} />,
    },
    {
      href: ROUTES.SUPER_ADMIN_PLANS,
      label: "Plans",
      icon: <FontAwesomeIcon icon={faDollarSign} />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-primary">
        <LoadingIndicator size="lg" text="Verifying Super Admin access..." />
      </div>
    );
  }

  if (!isLoading && isAuthenticated && user?.role === ROLES.SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex bg-dark-primary">
        <Sidebar
          title="SA Panel"
          collapsedIcon={<span className="text-2xl font-bold">S</span>}
          headerLink={ROUTES.SUPER_ADMIN_DASHBOARD}
          menuItems={superAdminNavItems}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLinkClick={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title="SA Dashboard"
            titleLink={ROUTES.SUPER_ADMIN_DASHBOARD}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            isAuthenticated={isAuthenticated}
            onLogout={logout}
          />

          <main className="flex-grow p-4 md:p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-primary">
      <LoadingIndicator size="lg" text="Redirecting..." />
    </div>
  );
}
