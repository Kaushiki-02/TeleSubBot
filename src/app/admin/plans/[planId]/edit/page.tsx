// app/(admin)/plans/[planId]/edit/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageTitle from "../../../../../components/ui/PageTitle";
import PlanForm from "../../../../../components/admin/PlanForm";
import LoadingIndicator from "../../../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../../../components/ui/ErrorMessage";
import Button from "../../../../../components/ui/Button";
import { getPlanDetails, updateAdminPlan } from "../../../../../lib/apiClient";
import { Plan, PlanUpdatePayload } from "../../../../../types";
import { getErrorMessage } from "../../../../../lib/utils";
import toast from "react-hot-toast";

// const getPlanByIdWorkaround = async (planId: string): Promise<Plan | null> => { ... };

export default function EditPlanPage() {
  const router = useNavigate();
  const params = useParams();
  const planId = params.planId as string;

  // State for plan data and loading/error states
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // Loading initial plan data
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading during update submission
  const [error, setError] = useState<string | null>(null); // Error loading data or during submit
  const [formError, setFormError] = useState<string | null>(null); // Specific error for form submission

  // Memoized function to fetch plan data
  const fetchPlanData = useCallback(async () => {
    if (!planId) {
      setError("Plan ID is missing.");
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    setError(null);
    setFormError(null);
    try {
      const data = await getPlanDetails(planId);
      // getPlanDetails throws if not found, so no need for explicit null check here
      setPlan(data);
      console.log(`Plan data loaded: ${data.name}`);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`Failed to fetch plan ${planId}:`, message);
      // Distinguish between not found and other errors if needed
      if (message.toLowerCase().includes("not found")) {
        setError("Plan not found or you do not have permission to access it.");
      } else {
        setError(message); // Set page-level error
      }
      toast.error(`Error loading plan data: ${message}`, {
        id: `fetch-plan-${planId}-error`,
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [planId]); // Dependency on planId

  // Fetch data on mount
  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  // Handler for form submission (Update)
  const handleSubmit = async (formData: PlanUpdatePayload) => {
    if (!planId || !plan) {
      // Need planId for the API call
      toast.error("Cannot update plan: Plan ID missing.", {
        id: `update-plan-${planId}-error`,
      });
      return;
    }
    setIsSubmitting(true);
    setFormError(null); // Clear previous form error
    try {
      const updatedPlan = await updateAdminPlan(planId, formData);
      toast.success(`Plan '${updatedPlan.name}' updated successfully!`, {
        id: `update-plan-${planId}-success`,
      });
      // Go back to the previous page (likely the channel's plan list)
      router(-1);
      // Alternative: If channel context was available: router.push(ROUTES.ADMIN_CHANNEL_PLANS(plan.channel_id));
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to update plan:", message);
      setFormError(message); // Display error within the form
      toast.error(`Failed to update plan: ${message}`, {
        id: `update-plan-${planId}-error`,
      });
      setIsSubmitting(false); // Keep form active on error
    }
    // No finally block for setIsSubmitting on success due to navigation
  };

  if (isLoadingData) {
    return (
      <div>
        <PageTitle title="Edit Plan" />
        <LoadingIndicator text="Loading plan data..." />
      </div>
    );
  }

  // Show error if initial loading failed or planId was invalid
  if (error || !plan) {
    return (
      <div>
        <PageTitle title="Edit Plan" />
        <ErrorMessage
          title="Error Loading Plan"
          message={error || "Could not load plan data or Plan ID is invalid."}
        />
        <div className="mt-4 space-x-2">
          {/* Provide retry only if error occurred, not if plan is simply null */}
          {error && !error.toLowerCase().includes("not found") && (
            <Button onClick={fetchPlanData} variant="primary">
              Retry
            </Button>
          )}
          <Button variant="secondary" onClick={() => router(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Render form if data loaded successfully
  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <PageTitle
          title={`Edit Plan: ${plan.name}`}
          subtitle={`ID: ${plan._id}`}
        />
        <Button
          onClick={() => router(-1)}
          variant="secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>

      {/* Plan Form */}
      <PlanForm
        initialData={plan}
        onSubmit={handleSubmit}
        isLoading={isSubmitting} // Pass submission loading state
        formError={formError} // Pass submission error to the form
        isEditMode={true}
      />
    </div>
  );
}
