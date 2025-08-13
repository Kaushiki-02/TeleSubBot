// app/(admin)/plans/new/page.tsx

import { useState, useEffect, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageTitle from "../../../../components/ui/PageTitle";
import PlanForm from "../../../../components/admin/PlanForm";
import LoadingIndicator from "../../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../../components/ui/ErrorMessage";
import Button from "../../../../components/ui/Button";
import { createAdminPlan, getChannelDetails } from "../../../../lib/apiClient";
import { PlanCreatePayload, PopulatedChannel } from "../../../../types";
import { getErrorMessage } from "../../../../lib/utils";
import toast from "react-hot-toast";
import { ROUTES } from "../../../../lib/constants";

// Main component logic wrapped for Suspense to read query params
function CreatePlanContent() {
  const router = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const channelId = searchParams.get("channel_id");

  const [channel, setChannel] = useState<PopulatedChannel | null>(null); // Store channel details
  const [isLoading, setIsLoading] = useState(false); // Loading state for form submission
  const [isChannelLoading, setIsChannelLoading] = useState(true); // Loading channel info initially
  const [error, setError] = useState<string | null>(null); // Error during channel load or form submission

  // Fetch channel details to display name and ensure context
  useEffect(() => {
    const fetchChannel = async () => {
      if (!channelId) {
        toast.error("Channel context is missing. Cannot create plan.", {
          id: "create-plan-no-channel",
        });
        setError("No Channel ID provided in the URL.");
        setIsChannelLoading(false);
        // Optionally redirect, but showing error might be better
        // router.replace(ROUTES.ADMIN_CHANNELS);
        return;
      }
      setIsChannelLoading(true);
      setError(null);
      try {
        const data = await getChannelDetails(channelId);
        setChannel(data);
        console.log(`Channel loaded: ${data.name}`);
      } catch (err) {
        const message = getErrorMessage(err);
        toast.error(`Failed to load channel details: ${message}`, {
          id: "create-plan-fetch-channel-error",
        });
        setError(
          `Could not load details for Channel ID: ${channelId}. ${message}`
        );
      } finally {
        setIsChannelLoading(false);
      }
    };
    fetchChannel();
  }, [channelId]); // Re-run if channelId changes (though unlikely on this page)

  // Handler for plan form submission
  const handleSubmit = async (
    formData: Omit<PlanCreatePayload, "channel_id">
  ) => {
    if (!channelId) {
      toast.error("Channel ID is missing. Cannot submit.", {
        id: "create-plan-submit-no-id",
      });
      setError("Cannot submit: Channel ID is missing.");
      return;
    }
    setIsLoading(true); // Start loading indicator on button
    setError(null); // Clear previous submission errors
    try {
      // Combine form data with the channelId from context
      const payload: PlanCreatePayload = { ...formData, channel_id: channelId };
      const newPlan = await createAdminPlan(payload);
      toast.success(
        `Plan '${newPlan.name}' created successfully for channel '${channel?.name || channelId
        }'!`,
        { id: "create-plan-success" }
      );
      // Redirect back to the channel's plan list page
      router(ROUTES.ADMIN_CHANNEL_PLANS(channelId));
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to create plan:", message);
      setError(message); // Display error within the form section
      toast.error(`Failed to create plan: ${message}`, {
        id: "create-plan-submit-error",
      });
      setIsLoading(false); // Stop loading on error to allow retry
    }
    // No finally block needed for setIsLoading(false) on success due to navigation
  };

  // --- Render Logic ---

  // Show loading while fetching channel info
  if (isChannelLoading) {
    return (
      <div>
        <PageTitle title="Create New Plan" />
        <LoadingIndicator text="Loading channel information..." />
      </div>
    );
  }

  // Show error if channel loading failed or channelId was missing
  if (error && !channel) {
    // If there's an error AND channel data couldn't be loaded
    return (
      <div>
        <PageTitle title="Create New Plan" />
        <ErrorMessage
          title="Cannot Create Plan"
          message={error || "Failed to load required channel information."}
        />
        <Button variant="secondary" onClick={() => router(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  // Render form once channel info is available (or at least attempted)
  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        {/* Title referencing the channel */}
        <PageTitle
          title={`Create New Plan`}
          subtitle={
            channel ? `For Channel: ${channel.name}` : "Loading channel..."
          }
        />
        {/* Cancel button goes back to the previous page (likely channel plans) */}
        <Button
          onClick={() => router(-1)}
          variant="secondary"
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>

      {/* Plan Form Component */}
      <PlanForm
        onSubmit={handleSubmit}
        isLoading={isLoading} // Pass submission loading state
        formError={error && channel ? error : null} // Pass submission error only if channel loaded
        isEditMode={false}
      // No initial data for create mode
      />
    </div>
  );
}

// Export page component wrapped in Suspense for client-side reading of query params
export default function CreatePlanPage() {
  return (
    <Suspense fallback={<LoadingIndicator text="Loading..." />}>
      <CreatePlanContent />
    </Suspense>
  );
}
