// app/(admin)/layout.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Outlet } from "react-router-dom";
import LoadingIndicator from "../../components/ui/LoadingIndicator";
import Header from "../../components/layout/Header";
import Sidebar from "../../components/layout/Sidebar";
import { ROLES, ROUTES } from "../../lib/constants";

import {
  faListAlt,
  faUserEdit,
  faUsersCog,
  faTachometerAlt,
  faFunnelDollar,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function AdminLayout() {
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const router = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== ROLES.ADMIN) {
        console.log(
          "AdminLayout: Auth check failed or role mismatch. Redirecting to admin login."
        );
        router(ROUTES.LOGIN_ADMIN, { replace: true });
      } else {
        console.log("AdminLayout: Admin authenticated.");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  const adminNavItems = [
    {
      href: ROUTES.ADMIN_DASHBOARD,
      label: "Dashboard",
      icon: <FontAwesomeIcon icon={faTachometerAlt} />,
      isActiveCheck: (pn: string, hr: string) => pn === hr,
    },
    {
      href: ROUTES.ADMIN_CHANNELS,
      label: "My Channels",
      icon: <FontAwesomeIcon icon={faListAlt} />,
      isActiveCheck: (pathname: string, href: string) =>
        pathname.startsWith(href) ||
        pathname.startsWith(ROUTES.ADMIN_CHANNELS || "/admin/channels"),
    },
    {
      href: ROUTES.ADMIN_LEADS,
      label: "Channels Leads",
      icon: <FontAwesomeIcon icon={faFunnelDollar} />,
      isActiveCheck: (pathname: string, href: string) =>
        pathname.startsWith(href) ||
        pathname.startsWith(ROUTES.ADMIN_LEADS || "/admin/leads"),
    },
    {
      href: ROUTES.ADMIN_PROFILE,
      label: "My Profile",
      icon: <FontAwesomeIcon icon={faUserEdit} />,
      isActiveCheck: (pathname: string, href: string) =>
        pathname.startsWith(href) ||
        pathname === (ROUTES.ADMIN_PROFILE || "/admin/profile"),
    },
    {
      href: ROUTES.ADMIN_MY_TEAM,
      label: "My Team",
      icon: <FontAwesomeIcon icon={faUsersCog} />,
      isActiveCheck: (pathname: string, href: string) =>
        pathname.startsWith(href),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-primary">
        <LoadingIndicator size="lg" text="Verifying Admin access..." />
      </div>
    );
  }

  if (!isLoading && isAuthenticated && user?.role === ROLES.ADMIN) {
    return (
      <div className="min-h-screen flex bg-dark-primary">
        <Sidebar
          title="Admin Panel"
          collapsedIcon={<span className="text-2xl font-bold">A</span>}
          headerLink={ROUTES.ADMIN_DASHBOARD}
          menuItems={adminNavItems}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLinkClick={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title="Admin Dashboard"
            titleLink={ROUTES.ADMIN_DASHBOARD}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            isAuthenticated={isAuthenticated}
            onLogout={logout}
            profileRoute={ROUTES.ADMIN_PROFILE} // Pass the Admin profile route
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
