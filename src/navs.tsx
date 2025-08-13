import { Route, Routes } from "react-router-dom";
import NameMailPage from "./app/(auth)/name_edit/page";
import UserLoginPage from "./app/(auth)/login/page";
import AdminLoginPage from "./app/(auth)/login/admin/page";
import VerifyOtpPage from "./app/(auth)/verify-otp/page";
// Layouts
import UserLayout from "./app/user/layout";
import SuperAdminLayout from "./app/superadmin/layout";
import AdminLayout from "./app/admin/layout";

// User pages
import UserProfilePage from "./app/user/profile/page";
import UserGroup from "./app/user/my-groups/page";

// SuperAdmin pages
import SuperAdminChannelsPage from "./app/superadmin/channels/page";
import SuperAdminOverviewPage from "./app/superadmin/overview/page";
import SuperAdminPlansPage from "./app/superadmin/plans/page";
import SuperAdminSubscriptionsPage from "./app/superadmin/subscriptions/page";
import SuperAdminUsersPage from "./app/superadmin/users/page";
import SuperAdminTeamsPage from "./app/superadmin/teams/page"
import SuperAdminForgotpassPage from "./app/superadmin/teams/forgot/page";

// Admin pages
import AdminChannelsPage from "./app/admin/channels/page";
import AdminProfilePage from "./app/admin/profile/page";
import AdminMyTeamPage from "./app/admin/my-team/page";
import AdminOverview from "./app/admin/overview/page";
import AdminChannelEdit from "./app/admin/channels/[id]/edit/page";
import AdminChannelsubscriptions from "./app/admin/channels/[id]/subscriptions/page";
import AdminChannelplans from "./app/admin/channels/[id]/plans/page";
import AdminChanneloverview from "./app/admin/channels/[id]/overview/page";
import AdminPlanNew from "./app/admin/plans/new/page";
import AdminPlanEdit from "./app/admin/plans/[planId]/edit/page";
import PublicChannelPage from "./app/(public)/page";
import AdminLeasdsPage from "./app/admin/leads/page"
const Navs = () => {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<UserLoginPage />} />
            <Route path="/login" element={<UserLoginPage />} />
            <Route path="/login/admin" element={<AdminLoginPage />} />
            <Route path="/nameMail" element={<NameMailPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />

            {/* User routes */}
            <Route path="/user" element={<UserLayout />}>
                <Route path="profile" element={<UserProfilePage />} />
                <Route path="my-groups" element={<UserGroup />} />
            </Route>

            {/* SuperAdmin routes */}
            <Route path="/superadmin" element={<SuperAdminLayout />}>
                <Route path="channels" element={<SuperAdminChannelsPage />} />
                <Route path="overview" element={<SuperAdminOverviewPage />} />
                <Route path="plans" element={<SuperAdminPlansPage />} />
                <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
                <Route path="users" element={<SuperAdminUsersPage />} />
                <Route path="teams" element={<SuperAdminTeamsPage />} />
                <Route path="forgot" element={<SuperAdminForgotpassPage />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route path="overview" element={<AdminOverview />} />
                <Route path="channels" element={<AdminChannelsPage />} />
                <Route path="leads" element={<AdminLeasdsPage />} />
                <Route path="channels/:id/edit" element={<AdminChannelEdit />} />
                <Route path="channels/:id/subscriptions" element={<AdminChannelsubscriptions />} />
                <Route path="channels/:id/plans" element={<AdminChannelplans />} />
                <Route path="channels/:id/overview" element={<AdminChanneloverview />} />
                <Route path="profile" element={<AdminProfilePage />} />
                <Route path="my-team" element={<AdminMyTeamPage />} />
                <Route path="plans/new" element={<AdminPlanNew />} />
                <Route path="plans/:planId/edit" element={<AdminPlanEdit />} />
            </Route>
            <Route path="/channel/:referralCode" element={<PublicChannelPage />} />

            {/* Fallback for undefined routes */}
            <Route path="*" element={<UserLoginPage />} />
        </Routes>
    );
};

export default Navs;
