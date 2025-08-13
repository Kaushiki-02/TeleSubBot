// src/frontend/app/admin/my-team/page.tsx

import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import Table, { Th, Td } from "../../../components/ui/Table";
import RoleBadge from "../../../components/ui/RoleBadge";
import { useAuth } from "../../../context/AuthContext";
// import { UserProfile } from "../types"; // Assuming team members are UserProfile
import { formatDate } from "../../../lib/utils";
import EmptyState from "../../../components/ui/EmptyState";

export default function AdminMyTeamPage() {
  const { user, isLoading: isAuthLoading } = useAuth(); // Get logged-in admin and their team

  const teamMembers = user?.team_members || [];

  if (isAuthLoading) {
    return <LoadingIndicator text="Loading team information..." />;
  }

  if (!user || user.role !== "Admin") {
    // Should be handled by layout, but as a safeguard
    return (
      <ErrorMessage
        title="Access Denied"
        message="You are not authorized to view this page."
      />
    );
  }

  const headers = [
    <Th key="name">Name</Th>,
    <Th key="login_id">Login ID</Th>,
    <Th key="role">Role</Th>,
    <Th key="created_at">Joined On</Th>,
    // Add more relevant fields for team members if needed
  ];

  return (
    <div>
      <PageTitle
        title="My Team"
        subtitle="Support and Sales members linked to your Admin account."
      />

      <div className="mt-6 bg-dark-secondary rounded-lg shadow-md overflow-hidden border border-dark-tertiary">
        {teamMembers.length === 0 ? (
          <EmptyState message="You currently have no team members assigned." />
        ) : (
          <Table headers={headers}>
            {teamMembers.map((member: any) => (
              <tr key={member._id} className="hover:bg-dark-tertiary/30">
                <Td>{member.name || "-"}</Td>
                <Td>{member.loginId || "N/A"}</Td>
                <Td>
                  <RoleBadge
                    role={
                      typeof member.role_id === "object" && member.role_id?.name
                        ? member.role_id.name.toLowerCase()
                        : "unknown"
                    }
                    // role={member.role_id?.name?.toLowerCase?.() || "unknown"}
                    size="sm"
                  />
                </Td>
                <Td>{formatDate(member.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
