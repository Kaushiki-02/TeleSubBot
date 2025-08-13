// app/(superadmin)/plans/page.tsx


import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import Table, { Th, Td } from "../../../components/ui/Table";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  // getAdminPlans, // No longer needed for this page's primary plan display
  getAdminChannels, // To fetch all channels with their populated plans
  activateAdminPlan,
  deactivateAdminPlan,
  deleteAdminPlan, // This API call remains for deleting a plan
} from "../../../lib/apiClient";
import { Plan, PopulatedChannel } from "../../../types"; // Use PopulatedChannel
import { getErrorMessage } from "../../../lib/utils";
import toast from "react-hot-toast";
import { useLocation, Link, useNavigate } from "react-router-dom";

import { ROUTES } from "../../../lib/constants";
import { faToggleOn, faToggleOff, faTrashAlt, faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import EmptyState from "../../../components/ui/EmptyState";

export default function SuperAdminPlansPage() {
  const router = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [displayedPlans, setDisplayedPlans] = useState<Plan[]>([]);
  const [allChannelsWithPlans, setAllChannelsWithPlans] = useState<
    PopulatedChannel[]
  >([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    searchParams.get("channelId") || ""
  );
  const [selectedChannelName, setSelectedChannelName] = useState<string>(
    searchParams.get("channelName") || "Select a Channel"
  );

  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);


  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<Plan | null>(
    null
  );
  const [modalActionType, setModalActionType] = useState<
    "activate" | "deactivate" | "delete" | null
  >(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch all channels (which include their populated plans)
  const fetchAllChannelsData = useCallback(async () => {
    setIsLoadingChannels(true);
    setChannelsError(null);
    try {
      const channelsData = await getAdminChannels(); // SA gets all channels with populated plans
      setAllChannelsWithPlans(channelsData);

      // If channelId is in URL from navigation, find and set its plans and name
      const initialChannelId = searchParams.get("channelId");
      if (initialChannelId) {
        const initialChannel = channelsData.find(
          (c) => c._id === initialChannelId
        );
        if (initialChannel) {
          setDisplayedPlans(initialChannel.associated_plan_ids as Plan[]);
          setSelectedChannelName(initialChannel.name);
          setSelectedChannelId(initialChannelId); // Ensure selectedChannelId state is also set
        } else {
          setDisplayedPlans([]); // Channel not found, clear plans
          setSelectedChannelName("Channel Not Found");
        }
      } else {
        setDisplayedPlans([]); // No channel selected initially
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setChannelsError(`Failed to load channels and plans data: ${message}`);
      toast.error(`Error loading data: ${message}`, {
        id: "fetch-all-channels-plans-error",
      });
    } finally {
      setIsLoadingChannels(false);
    }
  }, [searchParams]); // searchParams as dependency to react to direct navigation with channelId

  useEffect(() => {
    fetchAllChannelsData();
  }, []);

  // Channel select options
  const channelOptions = useMemo(
    () => [
      { value: "", label: "Select a Channel to View Plans" },
      ...allChannelsWithPlans.map((channel) => ({
        value: channel._id,
        label: channel.name,
      })),
    ],
    [allChannelsWithPlans]
  );

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChannelId = e.target.value;
    setSelectedChannelId(newChannelId);

    if (newChannelId) {
      const channel = allChannelsWithPlans.find((c) => c._id === newChannelId);
      if (channel) {
        setDisplayedPlans(channel.associated_plan_ids as Plan[]);
        setSelectedChannelName(channel.name);
        // Update URL
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.set("channelId", newChannelId);
        currentParams.set("channelName", channel.name);
        router(
          `${window.location.pathname}?${currentParams.toString()}`,
          { replace: true }
        );
      } else {
        setDisplayedPlans([]);
        setSelectedChannelName("Channel Not Found");
      }
    } else {
      setDisplayedPlans([]);
      setSelectedChannelName("Select a Channel");
      // Update URL - remove channelId and channelName
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.delete("channelId");
      currentParams.delete("channelName");
      router(
        `${window.location.pathname}?${currentParams.toString()}`,
        { replace: true }
      );
    }
  };

  // --- Action Handlers (activate, deactivate, delete) ---
  // These remain largely the same, but after action, refetchAllChannelsData
  // because the plan's status or existence might change within the channel's associated_plan_ids.


  const handleToggleActiveClick = (plan: Plan) => {
    setSelectedPlanForModal(plan);
    setModalActionType(plan.is_active ? "deactivate" : "activate");
    setIsConfirmModalOpen(true);
  };

  const handleDeleteClick = (plan: Plan) => {
    if (plan.is_active) {
      // Assuming you have a similar check or logic
      toast.error("Deactivate the plan before deleting.", {
        id: `delete-active-plan-${plan._id}`,
      });
      return;
    }
    setSelectedPlanForModal(plan);
    setModalActionType("delete");
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedPlanForModal || !modalActionType) return;
    setModalLoading(true);
    setIsConfirmModalOpen(false);
    const planId = selectedPlanForModal._id;
    const planName = selectedPlanForModal.name;
    const action = modalActionType;
    const toastId = `plan-action-${action}-${planId}`;

    try {
      if (action === "activate") {
        await activateAdminPlan(planId);
      } else if (action === "deactivate") {
        await deactivateAdminPlan(planId);
      } else if (action === "delete") {
        await deleteAdminPlan(planId); // This API deletes the plan from DB and disassociates from channel
      }
      toast.success(`Plan '${planName}' ${action}d successfully.`, {
        id: toastId,
      });
      await fetchAllChannelsData(); // Refetch all channel data to get updated plan lists
    } catch (err) {
      const message = getErrorMessage(err);
      toast.error(`Failed to ${action} plan: ${message}`, {
        id: toastId,
        duration: 7000,
      });
    } finally {
      setModalLoading(false);
      setSelectedPlanForModal(null);
      setModalActionType(null);
    }
  };

  const modalConfig = useMemo(() => {
    if (!selectedPlanForModal || !modalActionType) return null;
    const planName = selectedPlanForModal.name;
    switch (modalActionType) {
      case "activate":
        return {
          title: "Confirm Activation",
          message: (
            <>
              Activate plan{" "}
              <strong className="text-text-primary">{planName}</strong>?
            </>
          ),
          confirmText: "Activate Plan",
          confirmButtonVariant: "success" as "success",
        };
      case "deactivate":
        return {
          title: "Confirm Deactivation",
          message: (
            <>
              Deactivate plan{" "}
              <strong className="text-text-primary">{planName}</strong>?
            </>
          ),
          confirmText: "Deactivate Plan",
          confirmButtonVariant: "warning" as "warning",
        };
      case "delete":
        return {
          title: "Confirm Deletion",
          message: (
            <>
              Permanently delete plan{" "}
              <strong className="text-text-primary">{planName}</strong>? This
              cannot be undone and will remove it from its channel.
            </>
          ),
          confirmText: "Delete Plan",
          confirmButtonVariant: "danger" as "danger",
        };
      default:
        return null;
    }
  }, [selectedPlanForModal, modalActionType]);

  const tableHeaders = [
    <Th key="name">Plan Name</Th>,
    // Channel name is now context, not a column here. Owner of the channel might be relevant.
    // Find owner from the selectedChannelId in allChannelsWithPlans
    <Th key="owner">Channel Owner</Th>,
    <Th key="price">Price</Th>,
    <Th key="validity">Validity</Th>,
    <Th key="status">Status</Th>,
    <Th key="actions"

      className="text-right sticky right-0 z-10 bg-[#191919]"

    >
      Actions
    </Th>,
  ];

  const renderPlanTable = () => {
    // If channels are loading, show a general loading indicator
    if (isLoadingChannels && !selectedChannelId) {
      return (
        <div className="min-h-[200px] flex items-center justify-center">
          <LoadingIndicator text="Loading channels list..." />
        </div>
      );
    }
    // If channel data loaded but error occurred
    if (channelsError && !selectedChannelId) {
      return (
        <ErrorMessage
          title="Error Loading Channel Data"
          message={channelsError}
        />
      );
    }
    // If no channel selected yet (after channels have loaded)
    if (!selectedChannelId && !isLoadingChannels) {
      return (
        <EmptyState message="Please select a channel to view its plans." />
      );
    }
    // If a channel is selected, but its plans are still being filtered/set (should be quick)
    // Or if the selected channel's plans are loading due to a direct navigation with channelId
    if (isLoadingChannels && selectedChannelId) {
      // Changed from isLoadingPlans
      return (
        <div className="min-h-[200px] flex items-center justify-center">
          <LoadingIndicator
            text={`Loading plans for ${selectedChannelName}...`}
          />
        </div>
      );
    }
    // If a channel is selected and there was an error fetching its parent channel list (which includes plans)
    if (channelsError && selectedChannelId) {
      return (
        <ErrorMessage
          title={`Error Loading Plans for ${selectedChannelName}`}
          message={channelsError}
        />
      );
    }

    if (
      displayedPlans.length === 0 &&
      selectedChannelId &&
      !isLoadingChannels
    ) {
      return (
        <EmptyState
          message={`No plans found for channel: ${selectedChannelName}.`}
        >
          <Link
            to={`${ROUTES.ADMIN_PLANS_NEW}?channel_id=${selectedChannelId}`}
          >
            <Button variant="primary" size="sm">
              Create First Plan for this Channel
            </Button>
          </Link>
        </EmptyState>
      );
    }

    const selectedChannel = allChannelsWithPlans.find(
      (c) => c._id === selectedChannelId
    );
    const channelOwnerName =
      selectedChannel && typeof selectedChannel.owner === "object"
        ? selectedChannel.owner.name ||
        selectedChannel.owner.loginId ||
        selectedChannel.owner.phone ||
        "N/A"
        : "N/A";

    return (
      <Table
        headers={tableHeaders}
        isLoading={isLoadingChannels && !!selectedChannelId}
        loadingRowCount={5}
      >
        {displayedPlans.map((plan) => (
          <tr key={plan._id} className="hover:bg-dark-tertiary/30">
            <Td>{plan.name}</Td>
            <Td>{channelOwnerName}</Td>
            <Td>
              {plan.markup_price != null &&
                plan.discounted_price != null &&
                plan.markup_price > plan.discounted_price && (
                  <span className="line-through text-text-disabled mr-1">
                    ₹{plan.markup_price}
                  </span>
                )}
              <span className="text-functional-success font-medium">
                ₹{plan.discounted_price ?? plan.markup_price}
              </span>
            </Td>

            <Td>{plan.validity_days} days</Td>
            <Td>
              <Badge
                status={plan.is_active ? "active" : "inactive"}
                size="sm"
              />
            </Td>
            <Td className="text-right sticky right-0 z-10 bg-[#1b1b1b]">

              <div className="flex justify-end space-x-2">
                <Link to={ROUTES.ADMIN_PLAN_EDIT(plan._id)}>
                  <Button variant="info" size="sm" title="Edit Plan">
                    <FontAwesomeIcon icon={faEdit} />
                  </Button>
                </Link>
                <Button
                  onClick={() => handleToggleActiveClick(plan)}
                  variant={plan.is_active ? "warning" : "success"}
                  size="sm"
                  title={plan.is_active ? "Deactivate" : "Activate"}
                >
                  {plan.is_active ? <FontAwesomeIcon icon={faToggleOff} /> : <FontAwesomeIcon icon={faToggleOn} />}
                </Button>
                <Button
                  onClick={() => handleDeleteClick(plan)}
                  variant="danger"
                  size="sm"
                  disabled={plan.is_active}
                  title={plan.is_active ? "Deactivate first" : "Delete"}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    );
  };

  return (
    <div>
      <PageTitle
        title="Channel Plan Management"
        subtitle="View and manage plans for a specific channel."
      />

      <div className="my-6 p-4 bg-dark-secondary rounded-lg shadow border border-dark-tertiary">
        <Select
          label="Select Channel"
          options={channelOptions}
          value={selectedChannelId}
          onChange={handleChannelChange}
          isLoading={isLoadingChannels}
          disabled={isLoadingChannels}
          error={channelsError} // Display error related to fetching channels
          containerClassName="mb-0"
        />
        {selectedChannelId &&
          !isLoadingChannels && ( // Show create button only if a channel is selected and not loading
            <div className="mt-4">
              <Link
                to={`${ROUTES.ADMIN_PLANS_NEW}?channel_id=${selectedChannelId}`}
              >
                <Button variant="primary" size="sm">
                  + Create New Plan for {selectedChannelName}
                </Button>
              </Link>
            </div>
          )}
      </div>

      {/* Display plans table or relevant state message */}
      <div className="bg-dark-secondary rounded-lg shadow-md overflow-hidden border border-dark-tertiary">
        {renderPlanTable()}
      </div>
      {/* Pagination might not be needed here if plan lists per channel are short */}

      {modalConfig && selectedPlanForModal && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmAction}
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
