// app/(admin)/channels/[id]/plans/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import PageTitle from "../../../../../components/ui/PageTitle";
import LoadingIndicator from "../../../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../../../components/ui/ErrorMessage";
import EmptyState from "../../../../../components/ui/EmptyState";
import Button from "../../../../../components/ui/Button";
// import ConfirmationModal from "../components/ui/ConfirmationModal";
import PlanListItem from "../../../../../components/admin/PlanListItem";
import {
  getChannelDetails,
  // getPlansForChannel,
  deactivateAdminPlan,
  activateAdminPlan,
  deleteAdminPlan,
} from "../../../../../lib/apiClient";
import { Plan, Channel } from "../../../../../types";
import { getErrorMessage } from "../../../../../lib/utils";
import toast from "react-hot-toast";
import { ROUTES } from "../../../../../lib/constants";
export default function ChannelPlansPage() {
  const router = useNavigate();
  const params = useParams();
  const channelId = params.id as string;

  const [channel, setChannel] = useState<Channel | null | any>(null);
  const [plans, setPlans] = useState<Plan[] | undefined>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  // Data Fetching Logic
  const fetchPageData = useCallback(async () => {
    if (!channelId) return;
    setIsLoading(true);
    setError(null);
    setActionLoading({});
    try {
      // Fetch channel details (for name) and plans concurrently
      const channelDataResponse = await Promise.all([
        getChannelDetails(channelId).catch((err) => {
          // Expect PopulatedChannel from getChannelDetails
          console.error(
            "Failed to fetch channel details:",
            getErrorMessage(err)
          );
          toast.error(`Could not load channel name: ${getErrorMessage(err)}`, {
            id: `fetch-channel-${channelId}-error`,
          });
          return null; // Return null on error
        }),
        // getPlansForChannel(channelId), // Fetch plans using the new dedicated endpoint
      ]);

      // Set channel state if fetch was successful
      if (channelDataResponse && channelDataResponse.length > 0) {
        setChannel(channelDataResponse[0]);
      }

      // Expect PopulatedChannel from getChannelDetails
      setPlans(channelDataResponse[0]?.associated_plan_ids);
    } catch (err) {
      // This catch block will primarily handle errors from getPlansForChannel now
      const message = getErrorMessage(err);
      console.error("Failed to fetch channel plans:", message);
      setError(`Failed to load plans: ${message}`); // Update error message focus
      toast.error(`Error loading channel plans: ${message}`, {
        id: `fetch-plans-${channelId}-error`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  // Fetch data on component mount
  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  // Helper to set loading state for a specific plan action
  const setPlanActionLoading = (planId: string, loading: boolean) => {
    setActionLoading((prev) => ({ ...prev, [planId]: loading }));
  };

  // Handler for toggling plan active status
  const handleToggleActive = async (planId: string, isActive: boolean) => {
    setPlanActionLoading(planId, true);
    const actionType = isActive ? "activate" : "deactivate";
    const actionToastId = `toggle-plan-${actionType}-${planId}`;
    toast.loading(`${isActive ? "Activating" : "Deactivating"} plan...`, {
      id: actionToastId,
    });

    try {
      if (isActive) {
        await activateAdminPlan(planId);
      } else {
        await deactivateAdminPlan(planId);
      }
      toast.success(
        `Plan ${isActive ? "activated" : "deactivated"} successfully!`,
        { id: actionToastId }
      );
      fetchPageData(); // Refresh all data
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`Failed to ${actionType} plan ${planId}:`, message);
      toast.error(`Failed to ${actionType} plan: ${message}`, {
        id: actionToastId,
        duration: 7000,
      });
    } finally {
      setPlanActionLoading(planId, false);
    }
  };

  // Handler for removing plan association from channel
  const handleDeletePlan = async (planId: string) => {
    if (!channelId) return;
    setPlanActionLoading(planId, true);
    const actionToastId = `delete-plan-${planId}`;
    toast.loading(`Deleting Plan...`, { id: actionToastId });

    try {
      await deleteAdminPlan(planId);

      toast.success(`Plan deleted  successfully.`, {
        id: actionToastId,
      });
      fetchPageData(); // Refresh all data
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(
        `Failed to delete plan ${planId} from channel ${channelId}:`,
        message
      );
      toast.error(`Failed to delete plan: ${message}`, {
        id: actionToastId,
        duration: 7000,
      });
    } finally {
      setPlanActionLoading(planId, false);
    }
  };

  const handleEditClick = (planId: string) => {
    router(ROUTES.ADMIN_PLAN_EDIT(planId));
  };

  const handleToggleActiveClick = (plan: Plan) => {
    handleToggleActive(plan._id, !plan.is_active);
  };

  const handleDeletePlanClick = (plan: Plan) => {
    handleDeletePlan(plan._id);
  };

  const renderPlanListContent = () => {
    if (isLoading && plans && plans.length === 0) {
      return <LoadingIndicator text="Loading channel plans..." />;
    }

    // Display error if plan fetching specifically failed (error state is set)
    if (error) {
      return (
        <div className="text-center">
          <ErrorMessage title="Error Loading Plans" message={error} />
          <Button onClick={fetchPageData} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    if (!isLoading && plans && plans.length === 0) {
      return (
        <EmptyState message="No plans are associated with this channel yet.">
          <Link to={`${ROUTES.ADMIN_PLANS_NEW}?channel_id=${channelId}`}>
            <Button variant="primary" size="md">
              Create First Plan for this Channel
            </Button>
          </Link>
        </EmptyState>
      );
    }

    return (
      <div className="space-y-4">
        {plans &&
          plans.map((plan, index) => (
            <PlanListItem
              key={plan._id || index}
              plan={plan}
              isLoading={actionLoading[plan._id] || false}
              onEdit={() => handleEditClick(plan._id)}
              onToggleActive={() => handleToggleActiveClick(plan)}
              onDeletePlan={() => handleDeletePlanClick(plan)}
            />
          ))}
      </div>
    );
  };

  return (
    <div>
      {/* Page Header - Uses 'channel' state for name */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <Button
            onClick={() => router(ROUTES.ADMIN_CHANNELS)}
            variant="link"
            size="sm"
            className="mb-1 text-text-secondary hover:text-text-primary"
          >
            ← Back to My Channels
          </Button>
          <PageTitle
            title={`Manage Plans`}
            subtitle={`For Channel: ${
              channel?.name || (isLoading ? "Loading..." : channelId)
            }`} // Show ID if name fails to load
          />
        </div>
        {!isLoading && !error && (
          <Link
            to={`${ROUTES.ADMIN_PLANS_NEW}?channel_id=${channelId}`}
            className="flex-shrink-0"
          >
            <Button variant="primary" size="md">
              + Create Plan for this Channel
            </Button>
          </Link>
        )}
      </div>

      {/* Plan List Content Area */}
      <div className="bg-dark-secondary p-4 md:p-6 rounded-lg shadow-md min-h-[200px] flex flex-col justify-center">
        {renderPlanListContent()}
      </div>

      {/* Confirmation Modal */}
    </div>
  );
}
