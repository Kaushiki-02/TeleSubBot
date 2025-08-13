// app/(superadmin)/channels/page.tsx


import { useState, useEffect, useCallback, useMemo } from "react";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import Table, { Th, Td } from "../../../components/ui/Table";
import PaginationControls from "../../../components/ui/PaginationControls";
import FilterControls from "../../../components/admin/FilterControls";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  getAdminChannels, // Expects to return PopulatedChannel[] now for SA
  activateAdminChannel,
  deactivateAdminChannel,
} from "../../../lib/apiClient";
import { PopulatedChannel, Plan } from "../../../types"; // Use PopulatedChannel
import { getErrorMessage } from "../../../lib/utils";
import toast from "react-hot-toast";
import { useDebounce } from "../../../lib/hooks";
import { Link, useLocation } from "react-router-dom";

import { ROUTES } from "../../../lib/constants"; // Ensure ROUTES is imported
import EmptyState from "../../../components/ui/EmptyState";
import { maskPhone } from "../../../lib/utils"; // Import maskPhone for owner display

const ITEMS_PER_PAGE = 20;

export default function SuperAdminChannelsPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [channels, setChannels] = useState<PopulatedChannel[]>([]); // Use PopulatedChannel
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0); // This should come from API if paginating server-side

  // Action loading state (e.g., for activate/deactivate)
  const [actionLoading,] = useState<Record<string, boolean>>(
    {}
  );

  // Filter State
  const [nameFilter, setNameFilter] = useState(searchParams.get("name") || "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page") || "1")
  );

  const debouncedNameFilter = useDebounce(nameFilter, 500);

  // Modal State for Activate/Deactivate
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedChannelForModal, setSelectedChannelForModal] =
    useState<PopulatedChannel | null>(null);
  const [modalActionType, setModalActionType] = useState<
    "activate" | "deactivate" | null
  >(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchChannels = useCallback(
    async (page: number, name: string, status: string) => {
      setIsLoading(true);
      setError(null);
      console.log(
        `SA Fetching channels - Page: ${page}, Name: ${name || "any"
        }, Status: ${status || "any"}`
      );

      // Update URL
      const currentParams = new URLSearchParams(window.location.search);
      if (page > 1) currentParams.set("page", String(page));
      else currentParams.delete("page");
      if (name) currentParams.set("name", name);
      else currentParams.delete("name");
      if (status) currentParams.set("status", status);
      else currentParams.delete("status");
      const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
      window.history.pushState({ path: newUrl }, "", newUrl);

      try {
        const apiFilters = {
          name: name || undefined,
          is_active: status ? status === "active" : undefined,
          page: page,
          limit: ITEMS_PER_PAGE,
        };
        // getAdminChannels for SuperAdmin should now return PopulatedChannel[]
        const fetchedChannels = await getAdminChannels(apiFilters);
        setChannels(fetchedChannels);
        // If backend doesn't return total, use fetched length. For server-side pagination, API should provide total.
        setTotalItems(fetchedChannels.length); // This might need adjustment if API returns total count
        setCurrentPage(page);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(`Failed to load channels: ${message}`);
        toast.error(`Error loading channels: ${message}`, {
          id: "fetch-channels-error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchChannels(currentPage, debouncedNameFilter, statusFilter);
  }, []);

  const handleFilterChange = (filters: { phone?: string; status?: string }) => {
    if (currentPage !== 1) setCurrentPage(1);
    setNameFilter(filters.phone ?? "");
    setStatusFilter(filters.status ?? "");
  };
  const handleClearFilters = () => {
    if (currentPage !== 1) setCurrentPage(1);
    setNameFilter("");
    setStatusFilter("");
  };
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const statusOptions = useMemo(
    () => [
      { value: "", label: "All Statuses" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    []
  );

  const handleToggleActiveClick = (channel: PopulatedChannel) => {
    setSelectedChannelForModal(channel);
    setModalActionType(channel.is_active ? "deactivate" : "activate");
    setIsConfirmModalOpen(true);
  };

  const handleConfirmToggleActive = async () => {
    if (!selectedChannelForModal || !modalActionType) return;
    setModalLoading(true);
    setIsConfirmModalOpen(false); // Close modal immediately
    const channelId = selectedChannelForModal._id;
    const channelName = selectedChannelForModal.name;
    const action = modalActionType;
    const toastId = `toggle-channel-${action}-${channelId}`;

    try {
      if (action === "activate") {
        await activateAdminChannel(channelId);
      } else {
        await deactivateAdminChannel(channelId);
      }
      toast.success(`Channel '${channelName}' ${action}d successfully.`, {
        id: toastId,
      });
      fetchChannels(currentPage, nameFilter, statusFilter);
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error(`Failed to ${action} channel: ${message}`, {
        id: toastId,
        duration: 7000,
      });
    } finally {
      setModalLoading(false);
      setSelectedChannelForModal(null);
      setModalActionType(null);
    }
  };

  const modalConfig = useMemo(() => {
    if (!selectedChannelForModal || !modalActionType) return null;
    const channelName = selectedChannelForModal.name;
    if (modalActionType === "activate") {
      return {
        title: "Confirm Activation",
        message: (
          <>
            Are you sure you want to activate the channel{" "}
            <strong className="text-text-primary">{channelName}</strong>? It
            will become publicly visible via its referral link (if any).
          </>
        ),
        confirmText: "Activate Channel",
        confirmButtonVariant: "success" as "success",
      };
    } else {
      return {
        title: "Confirm Deactivation",
        message: (
          <>
            Are you sure you want to deactivate the channel{" "}
            <strong className="text-text-primary">{channelName}</strong>? It
            will no longer be accessible via its public link.
          </>
        ),
        confirmText: "Deactivate Channel",
        confirmButtonVariant: "warning" as "warning",
      };
    }
  }, [selectedChannelForModal, modalActionType]);

  const tableHeaders = [
    <Th key="name">Name</Th>,
    <Th key="owner">Owner</Th>,
    <Th key="tg_id">Telegram ID/Handle</Th>,
    <Th key="status">Status</Th>,
    <Th key="plans_summary">Plans Overview</Th>,
    <Th key="ref_code">Referral Code</Th>,
    <Th
      key="actions"
      className="text-right sticky right-0 z-10 bg-[#191919]"
    >
      Actions
    </Th>

  ];

  const renderChannelTable = () => {
    if (isLoading && channels.length === 0)
      return (
        <div className="min-h-[300px] flex items-center justify-center">
          <LoadingIndicator text="Loading channels..." />
        </div>
      );
    if (error)
      return <ErrorMessage title="Error Loading Channels" message={error} />;
    if (!isLoading && channels.length === 0) {
      return (
        <EmptyState
          message={
            nameFilter || statusFilter
              ? "No channels match filters."
              : "No channels found."
          }
        >
          <Button
            onClick={handleClearFilters}
            variant="secondary"
            size="sm"
            disabled={!nameFilter && !statusFilter}
          >
            Clear Filters
          </Button>
        </EmptyState>
      );
    }

    return (
      <Table
        headers={tableHeaders}
        isLoading={isLoading}
        loadingRowCount={ITEMS_PER_PAGE}
      >
        {channels.map((channel) => {
          // Use channel.associated_plan_ids which is now populated with Plan objects
          const channelPlans = (channel.associated_plan_ids as Plan[]) || []; // Ensure it's an array of Plans

          const ownerInfo =
            typeof channel.owner === "object"
              ? channel.owner.name ||
              maskPhone(channel.owner.phone) || // Use maskPhone for privacy
              // channel.owner.loginId || // Include loginId if available
              channel.owner._id
              : channel.owner;

          return (
            <tr key={channel._id} className="hover:bg-dark-tertiary/30">
              <Td>{channel.name}</Td>
              <Td>{ownerInfo}</Td>
              <Td>{channel.telegram_chat_id}</Td>
              <Td>
                <Badge
                  status={channel.is_active ? "active" : "inactive"}
                  size="sm"
                />
              </Td>
              <Td>
                {channelPlans && channelPlans.length > 0 ? (
                  <div
                    className="max-w-xs truncate text-xs"
                    title={channelPlans.map((p) => p.name).join(", ")}
                  >
                    {channelPlans.slice(0, 2).map((p, idx) => (
                      <span key={p.name} className="mr-1">
                        {p.name} (
                        {p.discounted_price ? (
                          <>
                            <span className="line-through text-text-disabled">
                              ₹{p.markup_price}
                            </span>{" "}
                            <span className="text-functional-success">
                              ₹{p.discounted_price}
                            </span>
                          </>
                        ) : (
                          <span className="text-functional-success">
                            ₹{p.markup_price}
                          </span>
                        )}
                        )
                        {idx < channelPlans.slice(0, 2).length - 1 && ","}
                      </span>
                    ))}
                    {channelPlans.length > 2 && "..."}
                    <span className="text-text-secondary ml-1">
                      ({channelPlans.length})
                    </span>
                  </div>

                ) : (
                  "No plans"
                )}
              </Td>
              <Td>{channel.referralCode}</Td>
              <Td className="text-right sticky right-0 z-10 bg-[#1b1b1b]">

                <div className="flex justify-end space-x-2">
                  {/* Link to the repurposed SA plans page, passing channelId and name */}
                  <Link
                    to={`${ROUTES.SUPER_ADMIN_PLANS}?channelId=${channel._id
                      }&channelName=${encodeURIComponent(channel.name)}`}
                  >
                    <Button variant="info" size="sm">
                      Plans ({channelPlans?.length || 0})
                    </Button>
                  </Link>
                  {/* Link to SuperAdmin subscriptions page, filtering by channel ID */}
                  <Link
                    to={`${ROUTES.SUPER_ADMIN_SUBSCRIPTIONS}?channelId=${channel._id}`}
                  >
                    <Button variant="secondary" size="sm">
                      Subs
                    </Button>
                  </Link>

                  <Button
                    onClick={() => handleToggleActiveClick(channel)}
                    variant={channel.is_active ? "warning" : "success"}
                    size="sm"
                    isLoading={
                      actionLoading[channel._id] &&
                      modalActionType ===
                      (channel.is_active ? "deactivate" : "activate")
                    }
                    disabled={actionLoading[channel._id]}
                    title={
                      channel.is_active
                        ? "Deactivate Channel"
                        : "Activate Channel"
                    }
                  >
                    {channel.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    );
  };

  return (
    <div>
      <PageTitle
        title="Channel Management"
        subtitle="View and manage all channels in the system."
      />
      <FilterControls
        phoneFilter={nameFilter}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
        statusOptions={statusOptions}
        className="mt-6"
        phoneLabel="Filter by Channel Name"
        statusLabel="Filter by Status"
      />
      <div className="mt-6 bg-dark-secondary rounded-lg shadow-md overflow-hidden border border-dark-tertiary">
        {renderChannelTable()}
        {totalItems > ITEMS_PER_PAGE && (
          <PaginationControls
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
            className="px-4 py-3"
          />
        )}
      </div>
      {modalConfig && selectedChannelForModal && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmToggleActive}
          isLoading={modalLoading}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          confirmButtonVariant={modalConfig.confirmButtonVariant}
        />
      )}
    </div>
  );
}
