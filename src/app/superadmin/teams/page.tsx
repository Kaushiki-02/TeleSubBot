// app/(superadmin)/teams/page.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import Table, { Th, Td } from "../../../components/ui/Table";
import PaginationControls from "../../../components/ui/PaginationControls";
import FilterControls from "../../../components/admin/FilterControls";
import Button from "../../../components/ui/Button";
import CreateRoleUserForm from "../../../components/admin/CreateRoleUserForm";
import { getUsersList } from "../../../lib/apiClient";
import { UserProfile } from "../../../types";
import { getErrorMessage, formatDate } from "../../../lib/utils";
import toast from "react-hot-toast";
import { useDebounce } from "../../../lib/hooks";
import { useNavigate, useLocation } from "react-router-dom";
import EmptyState from "../../../components/ui/EmptyState";
import RoleBadge from "../../../components/ui/RoleBadge";
import { ROLES, ROUTES } from "../../../lib/constants";
import Input from "../../../components/ui/Input";
import { useAuth } from "../../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCsv, faPenToSquare } from "@fortawesome/free-solid-svg-icons";

const ITEMS_PER_PAGE = 20;

export default function SuperAdminUsersPage() {
  const location = useLocation();
  const { user: me } = useAuth();
  const router = useNavigate()
  const searchParams = new URLSearchParams(location.search);
  const [filerusers, setfilerUsers] = useState<UserProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  const [phoneFilter, setPhoneFilter] = useState(
    searchParams.get("phone") || ""
  );
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");
  const [belongsToFilter, setBelongsToFilter] = useState(
    searchParams.get("belongs_to") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page") || "1")
  );

  const debouncedPhoneFilter = useDebounce(phoneFilter, 500);
  const debouncedBelongsToFilter = useDebounce(belongsToFilter, 500);
  useEffect(() => {
    let filteredUsers = users;
    if (debouncedPhoneFilter) {
      filteredUsers = users.filter(
        (user) =>
          user.loginId?.startsWith(debouncedPhoneFilter) ||
          user.loginId?.includes(debouncedPhoneFilter)
      );
    }

    if (debouncedBelongsToFilter) {
      filteredUsers = filteredUsers.filter((user) => {
        if (Array.isArray(user.belongs_to)) {
          return user.belongs_to.some((admin) =>
            admin.includes(debouncedBelongsToFilter)
          );
        }
        return user.belongs_to?.toString().includes(debouncedBelongsToFilter);
      });
    }
    if (roleFilter) {
      filteredUsers = filteredUsers.filter((user) => {

        return user.role_id.name === roleFilter;
      });
    }
    filteredUsers.sort((a, b) => {
      const adminA = Array.isArray(a.belongs_to)
        ? a.belongs_to[0]
        : a.belongs_to;
      const adminB = Array.isArray(b.belongs_to)
        ? b.belongs_to[0]
        : b.belongs_to;
      return adminA < adminB ? -1 : adminA > adminB ? 1 : 0;
    });

    setfilerUsers(filteredUsers);
  }, [debouncedPhoneFilter, debouncedBelongsToFilter, users, roleFilter]);

  const fetchUsers = async (page: number) => {
    setIsLoading(true);
    setError(null);
    const currentParams = new URLSearchParams(window.location.search);
    if (page > 1) currentParams.set("page", String(page));
    else currentParams.delete("page");

    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    try {
      const apiFilters: any = {
        role: undefined,
        page: page,
        limit: ITEMS_PER_PAGE,
      };
      const { users: data, total } = await getUsersList(apiFilters);
      console.log("HELLO", data);
      const users = data.filter((user) =>
        ["Support", "Sales", "Admin", "SuperAdmin"].includes(user.role_id.name)

      );
      setUsers(users);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(`Failed to load users: ${message}`);
      toast.error(`Error loading users: ${message}`, {
        id: "fetch-users-error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const handleFilterChange = (filters: {
    phone?: string;
    status?: string;
    belongs_to?: string;
  }) => {
    if (currentPage !== 1) setCurrentPage(1);
    setPhoneFilter(filters.phone ?? "");
    setRoleFilter(filters.status ?? "");
    setBelongsToFilter(filters.belongs_to ?? "");
  };
  const handleClearFilters = () => {
    if (currentPage !== 1) setCurrentPage(1);
    setPhoneFilter("");
    setRoleFilter("");
    setBelongsToFilter("");
  };
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  const handleExportCSV = () => {
    if (!users.length) return;

    const headers = [
      "Name",
      "Login ID / Phone",
      "Role",
      "Belongs To",
      "OTP Verified",
      "KYC Status",
      "Created At",
    ];

    const rows = users.map((user) => {
      const belongsTo = user.belongs_to?.toString() || "-";

      return [
        user.name || "-",
        user.loginId || user.phone || "N/A",
        typeof user.role_id === "object" && user.role_id?.name
          ? user.role_id.name
          : "unknown",
        belongsTo,
        formatDate(user.createdAt),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const roleOptions = useMemo(
    () => [
      { value: "", label: "All Roles" },
      { value: ROLES.SUPER_ADMIN, label: "Super Admin" },
      { value: ROLES.ADMIN, label: "Admin" },
      { value: ROLES.SUPPORT, label: "Support" },
      { value: ROLES.SALES, label: "Sales" },
    ],
    []
  );

  const tableHeaders = [
    <Th key="name">Name</Th>,
    <Th key="login_id">Login ID</Th>,
    <Th key="role">Role</Th>,
    <Th key="belongs_to">Belongs To (Admin)</Th>,
    <Th key="created">Registered On</Th>,
    <Th key="actions" className="text-right sticky right-0 z-10 bg-[#191919]">
      Actions
    </Th>,
  ];

  const renderUserTable = () => {
    if (isLoading && users.length === 0)
      return (
        <div className="min-h-[300px] flex items-center justify-center">
          <LoadingIndicator text="Loading users..." />
        </div>
      );
    if (error)
      return <ErrorMessage title="Error Loading Users" message={error} />;
    if (!isLoading && users.length === 0) {
      return (
        <EmptyState
          message={
            phoneFilter || roleFilter || belongsToFilter
              ? "No users match filters."
              : "No users found."
          }
        >
          <Button
            onClick={handleClearFilters}
            variant="secondary"
            size="sm"
            disabled={!phoneFilter && !roleFilter && !belongsToFilter}
          >
            Clear Filters
          </Button>
        </EmptyState>
      );
    }
    const displayUsers =
      filerusers.length || debouncedPhoneFilter || debouncedBelongsToFilter
        ? filerusers
        : users;

    return (
      <div className="mt-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleExportCSV} variant="primary" size="sm">
            <FontAwesomeIcon icon={faFileCsv} className="mr-2" /> Export Users
          </Button>
        </div>
        <Table
          headers={tableHeaders}
          isLoading={isLoading}
          loadingRowCount={ITEMS_PER_PAGE}
        >
          {displayUsers.map((user) => {
            const belongsToDisplay = user.belongs_to?.toString() || "-";

            return (
              <tr key={user._id}>
                <Td>{user.name || "-"}</Td>
                <Td>{user.loginId || "N/A"}</Td>
                <Td>
                  <RoleBadge
                    role={
                      typeof user.role_id === "object" && user.role_id?.name
                        ? user.role_id.name
                        : "unknown"
                    }
                    size="sm"
                  />
                </Td>
                <Td>
                  {user._id === me.id ? "You" : belongsToDisplay.toString()}
                </Td>
                <Td>{formatDate(user.createdAt)}</Td>
                <Td className="text-right sticky right-0 z-10 bg-[#191919]">
                  {typeof user.role_id === "object" &&
                    user.role_id?.name === ROLES.ADMIN && (
                      <div className="flex flex-shrink-0 flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="info"
                          onClick={() => {
                            router(`${ROUTES.SUPER_ADMIN_FORGOT}?loginId=${user.loginId}`)
                          }}

                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="mr-1" />

                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            handleFilterChange({
                              belongs_to: user._id,
                              phone: "",
                              status: ROLES.SUPPORT,
                            });
                            toast.success(
                              `Showing team for ${user.name}. Clear 'Belongs To' filter to see all users.`
                            );
                          }}
                        >
                          View Team
                        </Button>
                      </div>
                    )}
                </Td>
              </tr>
            );
          })}
        </Table>
      </div>
    );
  };

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 space-y-6 md:space-y-8">
      <PageTitle
        title="Team Management"
        subtitle="View teams and create new Admin, Support, or Sales users."
      />
      <CreateRoleUserForm onUserCreated={() => fetchUsers(1)} />

      <div className="mt-6">
        <Input
          label="Filter by Admin (Enter Admin User ID to see their team)"
          value={belongsToFilter}
          onChange={(e) =>
            handleFilterChange({
              phone: phoneFilter,
              status: roleFilter,
              belongs_to: e.target.value,
            })
          }
          placeholder="Enter Admin User ID..."
          containerClassName="mb-0"
        />
        <FilterControls
          phoneFilter={phoneFilter}
          statusFilter={roleFilter}
          onFilterChange={handleFilterChange}
          statusOptions={roleOptions}
        />
      </div>
      {renderUserTable()}
      {totalItems > ITEMS_PER_PAGE && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      )}
    </div>
  );
}
