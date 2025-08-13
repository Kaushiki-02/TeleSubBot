// app/(admin)/channels/[id]/subscriptions/page.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import PageTitle from "../../../../../components/ui/PageTitle";
import LoadingIndicator from "../../../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../../../components/ui/ErrorMessage";
import SubscriptionTable from "../../../../../components/admin/SubscriptionTable";
import FilterControls from "../../../../../components/admin/FilterControls";
import PaginationControls from "../../../../../components/ui/PaginationControls";
import Button from "../../../../../components/ui/Button";
import ExtendModal from "../../../../../components/admin/ExtendModal";
import ConfirmationModal from "../../../../../components/ui/ConfirmationModal";
import {
  getAdminChannelSubscriptions,
  getChannelDetails,
  extendSubscription,
  revokeSubscription,
} from "../../../../../lib/apiClient";
import {
  SubscriptionAdminResponse,
  PopulatedChannel,
} from "../../../../../types";
import { getErrorMessage, formatDate } from "../../../../../lib/utils"; // Import maskPhone
import toast from "react-hot-toast";
import { useDebounce } from "../../../../../lib/hooks";
import { SUBSCRIPTION_STATUS, ROUTES } from "../../../../../lib/constants";
import EmptyState from "../../../../../components/ui/EmptyState";
import Input from "../../../../../components/ui/Input";


const ITEMS_PER_PAGE = 15; // Number of items per page

export default function ChannelSubscriptionsPage() {
  const router = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const params = useParams();
  const channelId = params.id as string;

  // State for channel details and subscriptions
  const [channel, setChannel] = useState<PopulatedChannel | null>(null);
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionAdminResponse[]
  >([]);
  const [filersubs, setfilersubs] = useState<SubscriptionAdminResponse[]>([]);
  const [filly, setfilly] = useState(true)
  const [isLoading, setIsLoading] = useState(true); // Loading state for table/initial data
  const [error, setError] = useState<string | null>(null); // Error fetching data

  // Filter State - Initialize from URL search params
  const [phoneFilter, setPhoneFilter] = useState(
    searchParams.get("phone") || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page") || "1")
  );

  // Modal States
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionAdminResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false); // Loading state for modal actions
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const formatDefaultDate = (date: Date) => date.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(
    formatDefaultDate(firstDayOfMonth)
  );
  const [endDate, setEndDate] = useState<string>(
    formatDefaultDate(lastDayOfMonth)
  );
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };
  // Fetch Channel Details (e.g., for name in title) - runs once
  useEffect(() => {
    const fetchChannelInfo = async () => {
      if (!channelId) return;
      try {
        console.log(`Fetching details for channel: ${channelId}`);
        const data = await getChannelDetails(channelId);
        setChannel(data);
        console.log(`Channel name: ${data.name}`);
      } catch (err) {
        // Don't block subscription loading if name fails, just show ID
        console.error("Failed to fetch channel name:", getErrorMessage(err));
        setError(
          "Could not load channel details, but attempting to load subscriptions."
        );
      }
    };
    fetchChannelInfo();
  }, [channelId]);

  const debouncedPhoneFilter = useDebounce(phoneFilter, 500);
  const debouncedStatusToFilter = useDebounce(statusFilter, 500);

  useEffect(() => {
    let filteredUsers = subscriptions;
    if (debouncedPhoneFilter) {
      filteredUsers = subscriptions.filter(
        (subs) =>
          subs.user_id.phone?.startsWith(debouncedPhoneFilter) ||
          subs.user_id.phone?.includes(debouncedPhoneFilter)
      );
    }

    if (debouncedStatusToFilter) {
      filteredUsers = filteredUsers.filter((subs) => {

        return subs.status === debouncedStatusToFilter;
      });
    }
    const checkS = new Date(startDate);
    const checkE = new Date(endDate);

    if (checkS < checkE) {

      filteredUsers = filteredUsers.filter((sub) => {
        const createdAt = new Date(sub.createdAt);
        return createdAt >= checkS && createdAt <= checkE;
      });
    }


    setfilersubs(filteredUsers);
  }, [debouncedPhoneFilter, debouncedStatusToFilter, subscriptions, filly]);


  // Memoized function to fetch subscriptions based on current filters/page
  const fetchSubscriptions = useCallback(
    async (page: number, phone: string, status: string) => {
      if (!channelId) return;
      console.log(
        `Fetching subscriptions for page ${page}, phone: ${phone || "any"
        }, status: ${status || "any"}`
      );
      setIsLoading(true);
      setError(null);

      // --- Update URL query params without full reload ---
      const currentParams = new URLSearchParams(window.location.search);
      if (page > 1) currentParams.set("page", String(page));
      else currentParams.delete("page");
      if (phone) currentParams.set("phone", phone);
      else currentParams.delete("phone");
      if (status) currentParams.set("status", status);
      else currentParams.delete("status");
      const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
      window.history.pushState({ path: newUrl }, "", newUrl);

      try {
        const filters = {
          // Send phone only if it's not empty
          userPhone: phone || undefined,
          status: status || undefined,
          // page: page,
          // limit: ITEMS_PER_PAGE,
        };
        const data = await getAdminChannelSubscriptions(channelId, filters);
        // REMOVE
        const found: any = data.subscriptions.find(
          (c) => c.channel_id == channelId
        );

        // Guarantee an array (empty if none found)
        const rawSubs = Array.isArray(found?.subscriptions)
          ? found.subscriptions
          : [];

        // Map safely over rawSubs
        const processed = rawSubs.map((sub: any) => ({
          ...sub,
          user_phone:
            typeof sub.user_id === "object" ? sub.user_id.phone : undefined,
          plan_name:
            typeof sub.plan_id === "object" ? sub?.plan_id?.name : undefined,
        }));

        setSubscriptions(processed);
        setCurrentPage(page);
        console.log(`Fetched ${subscriptions.length} subscriptions`);
      } catch (err) {
        const msg = getErrorMessage(err);
        console.error("Failed to fetch subscriptions:", msg);
        setError(msg);
        toast.error(`Error loading subscriptions: ${msg}`, {
          id: "fetch-subs-error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [channelId]
  );

  // Effect to trigger fetch when debounced filters or page change
  useEffect(() => {
    // Fetch using the debounced phone filter and current status/page
    fetchSubscriptions(currentPage, debouncedPhoneFilter, statusFilter);
  }, []); // Re-run when these change

  // --- Action Handlers ---
  const handleExtendClick = (sub: SubscriptionAdminResponse) => {
    setSelectedSubscription(sub);
    setIsExtendModalOpen(true);
  };

  const handleRevokeClick = (sub: SubscriptionAdminResponse) => {
    setSelectedSubscription(sub);
    setIsRevokeModalOpen(true);
  };

  const handleConfirmExtend = async (extensionDays: number) => {
    if (!selectedSubscription) return;
    setModalLoading(true);
    const subId = selectedSubscription._id;

    try {
      await extendSubscription(subId, { extension_days: extensionDays });
      toast.success(`Subscription extended by ${extensionDays} days.`, {
        id: `extend-${subId}`,
      });
      setIsExtendModalOpen(false);
      setSelectedSubscription(null);
      // Refetch the current page to reflect changes
      fetchSubscriptions(currentPage, phoneFilter, statusFilter);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Extend failed:", message);
      toast.error(`Failed to extend: ${message}`, { id: `extend-${subId}` });
      // Optionally keep modal open on error, or close as done here
      // setError(message); // Display error in modal? Or just toast?
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!selectedSubscription) return;
    setModalLoading(true);
    const subId = selectedSubscription._id;

    try {
      await revokeSubscription(subId);
      toast.success("Subscription revoked successfully.", {
        id: `revoke-${subId}`,
      });
      setIsRevokeModalOpen(false);
      setSelectedSubscription(null);
      // Refetch the current page
      fetchSubscriptions(currentPage, phoneFilter, statusFilter);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Revoke failed:", message);
      toast.error(`Failed to revoke: ${message}`, { id: `revoke-${subId}` });
      // setError(message); // Display error in modal?
    } finally {
      setModalLoading(false);
    }
  };

  // --- Filter & Pagination Handlers ---
  const handlePageChange = (newPage: number) => {
    // Let the useEffect trigger the fetch when currentPage state changes
    setCurrentPage(newPage);
  };

  // Called by FilterControls component when phone or status changes
  const handleFilterChange = (filters: { phone?: string; status?: string }) => {
    // Reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // Update local filter state (debounced effect will handle phone)
    setPhoneFilter(filters.phone ?? "");
    setStatusFilter(filters.status ?? "");
    // Let the useEffect trigger the actual fetch based on new state
  };

  const handleClearFilters = () => {
    // Reset filters and page, let useEffect trigger fetch
    if (currentPage !== 1) setCurrentPage(1);
    setPhoneFilter("");
    setStatusFilter("");
  };

  // Memoize status options to prevent re-creation on every render
  const statusOptions = useMemo(
    () => [
      { value: "", label: "All Statuses" },
      { value: SUBSCRIPTION_STATUS.ACTIVE, label: "Active" },
      { value: SUBSCRIPTION_STATUS.EXPIRED, label: "Expired" },
      { value: SUBSCRIPTION_STATUS.REVOKED, label: "Revoked" },
      { value: SUBSCRIPTION_STATUS.PENDING, label: "Pending" }, // Include if used
    ],
    []
  );
  const handleExportCSV = () => {
    if (!(filersubs.length ? filersubs : subscriptions).length) return;

    const headers = [
      "Phone",
      "Plan",
      "Status",
      "Sub On",
      "End Date",
      "Aadhar Card",
      "PAN Card"
    ];
    const rows = (filersubs.length ? filersubs : subscriptions).map((sub) => {

      return [
        sub.user_id.phone,
        typeof sub.plan_id === "object" && sub.plan_id !== null
          ? sub.plan_id.name
          : typeof sub.plan_id === "string"
            ? sub.plan_id
            : "N/A",
        sub.status,
        formatDate(sub.createdAt),
        formatDate(sub.end_date),
        sub.user_id.pan_number || "Pending",
        sub.user_id.aadhar_number || "Pending",
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
    link.setAttribute("download", "sub_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // --- Render Logic ---
  const RenderSubscriptionContent = () => {
    const displaySubs =
      filersubs.length || phoneFilter || statusFilter || startDate
        ? filersubs
        : subscriptions;

    const paginatedSubs = useMemo(() => {
      const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
      return displaySubs.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    }, [displaySubs, currentPage]);

    if (isLoading && subscriptions.length === 0) {
      return (
        <div className="flex justify-center items-center min-h-[200px]">
          <LoadingIndicator text="Loading subscriptions..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-4">
          <ErrorMessage title="Error Loading Subscriptions" message={error} />
          <Button
            onClick={() =>
              fetchSubscriptions(currentPage, debouncedPhoneFilter, statusFilter)
            }
            className="mt-4"
          >
            Retry Load
          </Button>
        </div>
      );
    }

    if (!isLoading && displaySubs.length === 0) {
      const message =
        phoneFilter || statusFilter
          ? "No subscriptions match the current filters."
          : "No subscriptions found for this channel yet.";
      return (
        <EmptyState message={message}>
          {(phoneFilter || statusFilter) && (
            <Button
              onClick={handleClearFilters}
              variant="secondary"
              size="sm"
              className="mt-2"
            >
              Clear Filters
            </Button>
          )}
        </EmptyState>
      );
    }

    return (
      <>
        <SubscriptionTable
          subscriptions={paginatedSubs}
          isLoading={isLoading}
          onExtend={handleExtendClick}
          onRevoke={handleRevokeClick}
        />
        <PaginationControls
          currentPage={currentPage}
          totalItems={displaySubs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
          className="px-4 py-3"
        />
      </>
    );
  };


  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        {/* Back navigation */}
        <Button
          onClick={() => router(ROUTES.ADMIN_CHANNELS)}
          variant="link"
          size="sm"
          className="mb-1 text-text-secondary hover:text-text-primary"
        >
          &larr; Back to My Channels
        </Button>
        {/* Use channel name if loaded, otherwise fallback to ID */}
        <PageTitle
          title={`Manage Subscriptions`}
          subtitle={`For Channel: ${channel?.name || channelId}`}
        />
      </div>

      {/* Filter Controls Section */}
      <FilterControls
        phoneFilter={phoneFilter}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
        statusOptions={statusOptions}
        handleExportCSV={handleExportCSV}
      />
      <div className="mb-6 rounded-lg shadow bg-dark-secondary border border-dark-tertiary">
        <div className="px-4 pt-4">
          <h2 className="text-lg font-semibold text-white mb-4">
            Subscription Date Filter
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4 pb-6">
          <Input
            label="Start Date"
            id="start-date"
            name="start-date"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            containerClassName="mb-0"
            disabled={isLoading}
          />

          <Input
            label="End Date"
            id="end-date"
            name="end-date"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            containerClassName="mb-0"
            disabled={isLoading}
          />

          <Button onClick={() => { setfilly(!filly) }} disabled={isLoading}>
            Apply Filter
          </Button>
        </div>
      </div>


      {/* Table and Pagination Section */}
      <div className="bg-dark-secondary rounded-lg shadow-md overflow-hidden">
        {/* Render table/loading/error/empty state */}
        {RenderSubscriptionContent()}
      </div>

      {/* Modals */}
      <ExtendModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        onConfirm={handleConfirmExtend}
        isLoading={modalLoading}
        subscription={selectedSubscription}
      />
      <ConfirmationModal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        onConfirm={handleConfirmRevoke}
        isLoading={modalLoading}
        title="Confirm Revocation"
        message={
          <>
            Are you sure you want to revoke the subscription for user{" "}
            <strong className="text-text-primary">
              {selectedSubscription?.user_phone}
            </strong>
            ?
            <br />
            <span className="text-sm text-functional-warning">
              Their access will be removed immediately.
            </span>
          </>
        }
        confirmText="Yes, Revoke Subscription"
        confirmButtonVariant="danger"
      />
    </div>
  );
}
