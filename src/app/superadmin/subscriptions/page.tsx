// app/(superadmin)/subscriptions/page.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import SubscriptionTable from "../../../components/admin/SubscriptionTable"; // Reuse the table component
import FilterControls from "../../../components/admin/FilterControls";
import PaginationControls from "../../../components/ui/PaginationControls";
import Button from "../../../components/ui/Button";
import ExtendModal from "../../../components/admin/ExtendModal";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  // getAdminChannelSubscriptions, // No longer needed for the general SA subscriptions list
  getAdminChannelSubscriptions, // Use the general API for all subscriptions (backend filters by channelId query param for SA)
  getChannelDetails, // Still needed to fetch channel name for the title if filtering by channel
  extendSubscription, // These actions are available to SA
  revokeSubscription,
} from "../../../lib/apiClient";
import { SubscriptionAdminResponse, Channel } from "../../../types";
import { getErrorMessage, maskPhone } from "../../../lib/utils";
import toast from "react-hot-toast";
import { useDebounce } from "../../../lib/hooks";
import { SUBSCRIPTION_STATUS, ROUTES } from "../../../lib/constants";
import EmptyState from "../../../components/ui/EmptyState";

const ITEMS_PER_PAGE = 15;

// Changed component name to be appropriate for SuperAdmin
export default function SuperAdminSubscriptionsPage() {
  const router = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  // Get channelId filter from query string (e.g., /superadmin/subscriptions?channelId=...)
  const channelIdFilter = searchParams.get("channelId"); // Changed from channelId = params.id

  // State for channel details (if filtered by channel) and subscriptions
  const [channel, setChannel] = useState<Channel | null | any>(null); // Still need this for title if filtering by channel
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionAdminResponse[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  // Filter State - Initialize from URL search params
  // phoneFilter, statusFilter, currentPage remain the same
  const [phoneFilter, setPhoneFilter] = useState(
    searchParams.get("phone") || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page") || "1")
  );

  const debouncedPhoneFilter = useDebounce(phoneFilter, 500);

  // Modal States remain the same
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionAdminResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch Channel Details if filtering by a specific channel (for title)
  useEffect(() => {
    const fetchChannelInfo = async () => {
      // Fetch only if a channelIdFilter is present in the query string
      if (!channelIdFilter) {
        setChannel(null); // Clear channel info if no filter
        return;
      }
      try {
        const data = await getChannelDetails(channelIdFilter); // Use the ID from the query string
        setChannel(data);
        console.log(`Filtered channel name: ${data.name}`);
      } catch (err) {
        // Don't block subscription loading if name fails, just show ID in title
        console.error(
          "Failed to fetch channel name for title:",
          getErrorMessage(err)
        );
        setChannel({
          _id: channelIdFilter,
          name: `ID: ${channelIdFilter}`,
        } as Channel); // Set a minimal channel object with ID for title
      }
    };
    fetchChannelInfo();
  }, [channelIdFilter]); // Dependency: channelIdFilter from query string

  // Memoized function to fetch subscriptions based on current filters/page
  const fetchSubscriptions = useCallback(
    async (
      page: number,
      phone: string,
      status: string,
      channelId: string | any
    ) => {
      // Added channelId parameter

      setIsLoading(true);
      setError(null);

      // Update URL query parameters
      const currentParams = new URLSearchParams();
      if (page > 1) currentParams.set("page", String(page));
      if (phone) currentParams.set("phone", phone);
      if (status) currentParams.set("status", status);
      if (channelId) currentParams.set("channelId", channelId); // Keep channelId in URL

      const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
      window.history.pushState({ path: newUrl }, "", newUrl);

      try {
        const filters = {
          userPhone: phone || undefined,
          status: status || undefined,
          // Pass channelId filter to the backend API call
          page: page,
          limit: ITEMS_PER_PAGE,
        };
        // Use the getAdminChannelSubscriptions API client function
        // This function expects filters including channelId if needed
        const data = await getAdminChannelSubscriptions(
          channelId as string,
          filters
        ); // Updated API call

        const groupForThisChannel: any = data.subscriptions.find(
          (grp) => grp.channel_id === channelId
        );

        // extract its subscriptions array (or fallback to empty array)
        const fetchedSubs = groupForThisChannel?.subscriptions ?? [];
        const total = fetchedSubs.length;
        console.log(data);
        // Process data to ensure user_phone and plan_name are accessible
        const processedData = fetchedSubs.map((sub: any) => ({
          ...sub,
          user_phone:
            typeof sub.user_id === "object"
              ? sub.user_id.phone || sub.user_id.loginId
              : undefined, // Include loginId
          plan_name:
            typeof sub.plan_id === "object"
              ? sub.plan_id.name
              : typeof sub.plan_id === "string"
                ? sub.plan_id
                : undefined, // Handle populated or just ID
          // Ensure channel_id is processed if needed for display in the table (though table might not need it if page is channel-specific)
          channel_name:
            typeof sub.channel_id === "object"
              ? sub.channel_id.name
              : typeof sub.channel_id === "string"
                ? sub.channel_id
                : undefined,
        }));

        setSubscriptions(processedData);
        setTotalItems(total); // Use total from API response
        setCurrentPage(page);
        console.log(
          `Fetched ${fetchedSubs.length} subscriptions (Total: ${total})`
        );
      } catch (err) {
        const message = getErrorMessage(err);
        console.error("Failed to fetch subscriptions:", message);
        setError(message);
        toast.error(`Error loading subscriptions: ${message}`, {
          id: "fetch-subs-error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [] // No dependencies on state vars, pass them as args
  );

  // Effect to trigger fetch when debounced filters, page, or channelIdFilter change
  useEffect(() => {
    // Pass the channelIdFilter from state to the fetch function
    fetchSubscriptions(
      currentPage,
      debouncedPhoneFilter,
      statusFilter,
      channelIdFilter
    );
  }, [
    fetchSubscriptions,
    currentPage,
    debouncedPhoneFilter,
    statusFilter,
    channelIdFilter,
  ]); // Added channelIdFilter dependency

  // --- Action Handlers ---
  // handleExtendClick, handleRevokeClick, handleConfirmExtend, handleConfirmRevoke
  // These remain the same, they call the existing extend/revoke API functions
  // and then refresh the list by calling fetchSubscriptions.

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
      // Refresh the current page with existing filters
      fetchSubscriptions(
        currentPage,
        phoneFilter,
        statusFilter,
        channelIdFilter
      );
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Extend failed:", message);
      toast.error(`Failed to extend: ${message}`, { id: `extend-${subId}` });
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
      // Refresh the current page with existing filters
      fetchSubscriptions(
        currentPage,
        phoneFilter,
        statusFilter,
        channelIdFilter
      );
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Revoke failed:", message);
      toast.error(`Failed to revoke: ${message}`, { id: `revoke-${subId}` });
    } finally {
      setModalLoading(false);
    }
  };

  // --- Filter & Pagination Handlers ---
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // fetchSubscriptions effect will be triggered by currentPage change
  };

  // Called by FilterControls component when phone or status changes
  const handleFilterChange = (filters: { phone?: string; status?: string }) => {
    if (currentPage !== 1) {
      setCurrentPage(1); // Reset to page 1 on filter change
    }
    setPhoneFilter(filters.phone ?? "");
    setStatusFilter(filters.status ?? "");
    // fetchSubscriptions effect will be triggered by filter state changes
  };

  const handleClearFilters = () => {
    if (currentPage !== 1) setCurrentPage(1);
    setPhoneFilter("");
    setStatusFilter("");
    // Keep channelIdFilter if present, unless specifically clearing it too
    // If you want a "Clear All" including channel filter:
    // if (channelIdFilter) setChannelIdFilter(null);
  };

  const statusOptions = useMemo(
    () => [
      { value: "", label: "All Statuses" },
      { value: SUBSCRIPTION_STATUS.ACTIVE, label: "Active" },
      { value: SUBSCRIPTION_STATUS.EXPIRED, label: "Expired" },
      { value: SUBSCRIPTION_STATUS.REVOKED, label: "Revoked" },
      { value: SUBSCRIPTION_STATUS.PENDING, label: "Pending" },
    ],
    []
  );

  // --- Render Logic ---
  const renderSubscriptionContent = () => {
    if (isLoading) {
      // Use general isLoading
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
            onClick={
              () =>
                fetchSubscriptions(
                  currentPage,
                  debouncedPhoneFilter,
                  statusFilter,
                  channelIdFilter
                ) // Pass all current filters
            }
            className="mt-4"
          >
            Retry Load
          </Button>
        </div>
      );
    }

    if (subscriptions.length === 0) {
      const message =
        phoneFilter || statusFilter
          ? `No subscriptions match the current filters${channelIdFilter ? ` for channel ID ${channelIdFilter}` : ""
          }.` // Include channel ID in message
          : `No subscriptions found${channelIdFilter
            ? ` for this channel (ID: ${channelIdFilter})`
            : ""
          } yet.`;
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
          {/* Option to clear channel filter if one is applied */}
          {channelIdFilter && (
            <Button
              onClick={() => {
                // Clear channel filter and potentially other filters
                handleClearFilters(); // Clear other filters if desired
                router(ROUTES.SUPER_ADMIN_SUBSCRIPTIONS); // Navigate back to general subs page
              }}
              variant="secondary"
              size="sm"
              className="mt-2 ml-2" // Add margin if Clear Filters button is also present
            >
              Clear Channel Filter
            </Button>
          )}
        </EmptyState>
      );
    }

    // Render the table and pagination
    return (
      <>
        <SubscriptionTable
          subscriptions={subscriptions}
          isLoading={isLoading}
          onExtend={handleExtendClick}
          onRevoke={handleRevokeClick}
        // Add other actions if needed (e.g., onViewDetails)
        />
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalItems} // Use totalItems from API response
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
        {/* Back navigation - Link back to SuperAdmin Channels */}
        <Button
          onClick={() => router(ROUTES.SUPER_ADMIN_CHANNELS)} // Link back to SA Channels
          variant="link"
          size="sm"
          className="mb-1 text-text-secondary hover:text-text-primary"
        >
          ← Back to Channels
        </Button>
        {/* Title dynamically updates based on whether filtering by channel */}
        <PageTitle
          title={`Manage Subscriptions`}
          subtitle={
            channelIdFilter
              ? `For Channel: ${channel?.name || channelIdFilter}` // Show channel name if loaded, else ID
              : "View and manage all subscriptions in the system." // General title if not filtered
          }
        />
      </div>

      {/* Filter Controls Section */}
      <FilterControls
        phoneFilter={phoneFilter}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
        statusOptions={statusOptions}
        className="mt-6" // Add spacing
        phoneLabel="Filter by User Phone" // Explicitly set label
        statusLabel="Filter by Status" // Explicitly set label
      />

      {/* Table and Pagination Section */}
      <div className="bg-dark-secondary rounded-lg shadow-md overflow-hidden border border-dark-tertiary">
        {renderSubscriptionContent()}
      </div>

      {/* Modals */}
      {selectedSubscription && ( // Only render modal if a subscription is selected
        <>
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
                  {maskPhone(selectedSubscription?.user_phone)}
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
        </>
      )}
    </div>
  );
}
