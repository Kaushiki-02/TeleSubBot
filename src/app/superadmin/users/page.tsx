// app/(superadmin)/users/page.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import Table, { Th, Td } from "../../../components/ui/Table";
import PaginationControls from "../../../components/ui/PaginationControls";
import FilterControls from "../../../components/admin/FilterControls";
import Button from "../../../components/ui/Button";
import { getUsersList } from "../../../lib/apiClient";
import { UserProfile } from "../../../types";
import { getErrorMessage, formatDate } from "../../../lib/utils";
import toast from "react-hot-toast";
import { useDebounce } from "../../../lib/hooks";
import { useLocation } from "react-router-dom";
import EmptyState from "../../../components/ui/EmptyState";
import RoleBadge from "../../../components/ui/RoleBadge";
import { ROLES } from "../../../lib/constants";
import Input from "../../../components/ui/Input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faFileCsv } from "@fortawesome/free-solid-svg-icons";

const ITEMS_PER_PAGE = 20;

export default function SuperAdminUsersPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filerusers, setfilerUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  const [phoneFilter, setPhoneFilter] = useState(
    searchParams.get("phone") || ""
  );
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
          user.phone?.startsWith(debouncedPhoneFilter) ||
          user.phone?.includes(debouncedPhoneFilter)
      );
    }

    if (debouncedBelongsToFilter) {
      filteredUsers = filteredUsers.filter((user) => {
        if (Array.isArray(user.belongs_to)) {
          return user.belongs_to.some((admin) =>
            admin.includes(debouncedBelongsToFilter)
          );
        }
        return user.belongs_to.toString().includes(debouncedBelongsToFilter);
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
  }, [debouncedPhoneFilter, debouncedBelongsToFilter, users]);

  const fetchUsers = useCallback(
    async (page: number, phone: string, adminId?: string) => {
      setIsLoading(true);
      setError(null);
      const currentParams = new URLSearchParams(window.location.search);
      if (page > 1) currentParams.set("page", String(page));
      else currentParams.delete("page");
      if (phone) currentParams.set("phone", phone);
      else currentParams.delete("phone");
      if (adminId) currentParams.set("belongs_to", adminId);
      else currentParams.delete("belongs_to");

      const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
      window.history.pushState({ path: newUrl }, "", newUrl);

      try {
        const apiFilters: any = {
          phone: phone || undefined,
          role: undefined,
          page: page,
          limit: ITEMS_PER_PAGE,
        };
        if (adminId) apiFilters.belongs_to = adminId;

        const { users: data, total } = await getUsersList(apiFilters);
        const admins = data.filter(
          (user) =>
            typeof user.role_id === "object" &&
            user.role_id?.name === ROLES.ADMIN
        );
        const users = data.filter(
          (user) =>
            typeof user.role_id === "object" &&
            user.role_id?.name === ROLES.USER
        );

        const updatedUsers = users.map((user) => {
          const matchingAdmins = admins.filter((admin) =>
            admin.channels.some((adminChannel) =>
              user.channels.includes(adminChannel)
            )
          );

          return {
            ...user,
            belongs_to: matchingAdmins.map((admin) => admin._id),
          };
        });
        setUsers(updatedUsers);
        // setTotalItems(total);
        // setCurrentPage(page);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(`Failed to load users: ${message}`);
        toast.error(`Error loading users: ${message}`, {
          id: "fetch-users-error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsers(currentPage, debouncedPhoneFilter, debouncedBelongsToFilter);
  }, [currentPage]);

  const handleClearFilters = () => {
    if (currentPage !== 1) setCurrentPage(1);
    setPhoneFilter("");
    setBelongsToFilter("");
  };
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  const handleExportCSV = () => {
    if (!(filerusers?.length ? filerusers : users).length) return;

    const headers = [
      "Login ID / Phone",
      "Role",
      "Belongs To",
      "OTP Verified",
      "KYC Status",
      "Created At",
      "Aadhar Card",
      "PAN Card",
    ];

    const rows = (filerusers?.length ? filerusers : users).map((user) => {
      const belongsTo = user.belongs_to?.toString() || "-";

      return [
        user.loginId || user.phone || "N/A",
        typeof user.role_id === "object" && user.role_id?.name
          ? user.role_id.name
          : "unknown",
        belongsTo,
        user.otp_verified_at ? "Yes" : "No",
        user.isKycSubmitted ? "Submitted" : "Not Submitted",
        formatDate(user.createdAt),
        user.aadhar_number,
        user.pan_number
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

  const tableHeaders = [
    <Th key="login_id">
      <FontAwesomeIcon icon={faUsers} className="mr-2 text-text-secondary" />
      Login ID / Phone
    </Th>,
    <Th key="role">Role</Th>,
    <Th key="belongs_to">Belongs To (Admin)</Th>,
    <Th key="verified">Verified</Th>,
    <Th key="kyc">KYC Status</Th>,
    <Th key="created">Registered On</Th>,
  ];

  const renderUserTable = () => {
    if (isLoading && users.length === 0)
      return (
        <div className="min-h-[300px] flex items-center justify-center bg-dark-secondary rounded-lg border border-dark-tertiary">
          <LoadingIndicator text="Loading users..." size="lg" />
        </div>
      );
    if (error)
      return (
        <ErrorMessage
          title="Error Loading Users"
          message={error}
          className="my-6"
        />
      );
    if (!isLoading && users.length === 0 && !phoneFilter && !belongsToFilter) {
      return (
        <EmptyState
          message="No users found in the system."
          icon={<FontAwesomeIcon icon={faUsers} />}
          className="my-6"
        ></EmptyState>
      );
    }

    const displayUsers =
      filerusers.length || phoneFilter || belongsToFilter ? filerusers : users; // Show filtered users if filters are applied, even if filter result is empty

    if (
      !isLoading &&
      displayUsers.length === 0 &&
      (phoneFilter || belongsToFilter)
    ) {
      return (
        <EmptyState
          message="No users match the current filters."
          icon={<FontAwesomeIcon icon={faUsers} />}
          className="my-6"
        >
          <Button
            onClick={handleClearFilters}
            variant="secondary"
            size="sm"
            disabled={!phoneFilter && !belongsToFilter}
          >
            Clear Filters
          </Button>
        </EmptyState>
      );
    }

    return (
      <div className="mt-4 space-y-4">
        <Table
          headers={tableHeaders}
          isLoading={isLoading}
          loadingRowCount={ITEMS_PER_PAGE}
        >
          {displayUsers.map((user) => {
            const belongsToDisplay = user.belongs_to?.toString() || "-";

            return (
              <tr key={user._id}>
                <Td>{user.loginId || user.phone || "N/A"}</Td>
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
                <Td>{belongsToDisplay.toString()}</Td>
                <Td>{user.otp_verified_at ? "Yes" : "No"}</Td>
                <Td>{user.isKycSubmitted ? "Submitted" : "Not Submitted"}</Td>
                <Td>{formatDate(user.createdAt)}</Td>
              </tr>
            );
          })}
        </Table>
      </div>
    );
  };

  return (
    <div>
      <PageTitle
        title="User Management"
        subtitle="View and manage system users, including Admins, Sales, and Support."
      />
      <div className="bg-dark-secondary rounded-lg shadow-md p-6 border border-dark-tertiary space-y-4">
        <h3 className="text-lg font-semibold text-text-primary border-b border-dark-tertiary pb-3">
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <Input
            label="Filter by Phone"
            id="phoneFilter"
            name="phoneFilter"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            placeholder="Enter phone..."
            containerClassName="mb-0"
            type="text"
          />
          <Input
            label="Filter by Admin ID"
            id="adminFilter"
            name="adminFilter"
            value={belongsToFilter}
            onChange={(e) => setBelongsToFilter(e.target.value)}
            placeholder="Enter Admin User ID..."
            containerClassName="mb-0"
          />
          <div className="flex justify-end md:justify-start">
            <Button
              onClick={() => fetchUsers(1, phoneFilter, belongsToFilter)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Apply Filters
            </Button>
            {handleExportCSV &&
              <Button onClick={handleExportCSV} variant="primary"
                className="w-full sm:w-auto ml-2"
                size="md">
                <FontAwesomeIcon icon={faFileCsv} /> Export To CSV
              </Button>

            }
          </div>
        </div>
        {(phoneFilter || belongsToFilter) && (
          <div className="flex justify-end mt-4">
            <Button onClick={handleClearFilters} variant="secondary" size="sm">
              Clear Filters
            </Button>
          </div>
        )}
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
