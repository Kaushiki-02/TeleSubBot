// app/(admin)/channels/[id]/edit/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageTitle from "../../../../../components/ui/PageTitle";
import ChannelForm from "../../../../../components/admin/ChannelForm";
import LoadingIndicator from "../../../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../../../components/ui/ErrorMessage";
import Button from "../../../../../components/ui/Button";
import ConfirmationModal from "../../../../../components/ui/ConfirmationModal";
import {
  getChannelDetails,
  updateAdminChannel,
  deleteAdminChannel,
} from "../../../../../lib/apiClient";
import { Channel, ChannelUpdatePayload, PopulatedChannel } from "../../../../../types";
import { getErrorMessage } from "../../../../../lib/utils";
import toast from "react-hot-toast";
import { ROUTES } from "../../../../../lib/constants";

export default function EditChannelPage() {
  const router = useNavigate();
  const params = useParams();
  const channelId = params.id as string;

  const [channel, setChannel] = useState<Channel | null | any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // Loading initial channel data
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading during update/delete actions
  const [error, setError] = useState<string | null>(null); // Error loading data or during submit
  const [formError, setFormError] = useState<string | null>(null); // Specifically for form submission errors

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // State for delete confirmation

  // Memoized function to fetch channel data
  const fetchChannelData = useCallback(async () => {
    if (!channelId) {
      setError("Channel ID is missing.");
      setIsLoadingData(false);
      return;
    }
    // console.log(`Fetching data for channel ID: ${channelId}`);
    setIsLoadingData(true);
    setError(null); // Clear previous errors
    setFormError(null);
    try {
      // Use getChannelDetails as it should handle ownership check via middleware
      const data: PopulatedChannel = await getChannelDetails(channelId);
      setChannel(data);
      console.log(`Channel data loaded: ${data.name}`);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`Failed to fetch channel ${channelId}:`, message);
      setError(message); // Set page-level error
      toast.error(`Error loading channel data: ${message}`, {
        id: `fetch-channel-${channelId}-error`,
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [channelId]); // Dependency on channelId

  // Fetch data on component mount or when channelId changes
  useEffect(() => {
    fetchChannelData();
  }, [fetchChannelData]);

  // Handler for form submission (Update)
  const handleSubmit = async (formData: ChannelUpdatePayload) => {
    if (!channelId) return;
    setIsSubmitting(true);
    setFormError(null); // Clear previous form error
    try {

      const updatedChannel = await updateAdminChannel(channelId, formData);
      toast.success(`Channel '${updatedChannel.name}' updated successfully!`, {
        id: `update-channel-${channelId}-success`,
      });
      // Optionally refetch data after update, or redirect immediately
      // await fetchChannelData(); // Refetch to show updated data on the form if staying
      router(ROUTES.ADMIN_CHANNELS); // Redirect back to list
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to update channel:", message);
      setFormError(message); // Display error within the form component
      toast.error(`Failed to update channel: ${message}`, {
        id: `update-channel-${channelId}-error`,
      });
      setIsSubmitting(false); // Keep form active on error
    }
    // No finally block for setIsSubmitting needed due to navigation on success
  };

  // Handler for initiating delete process
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
    if (!channelId || !channel) return; // Ensure channel data is available for name in toast
    setIsDeleteModalOpen(false); // Close modal
    setIsSubmitting(true); // Indicate loading state
    setError(null); // Clear previous page/form errors
    setFormError(null);

    try {

      await deleteAdminChannel(channelId);
      toast.success(`Channel '${channel.name}' deleted successfully!`, {
        id: `delete-channel-${channelId}-success`,
      });
      router(ROUTES.ADMIN_CHANNELS); // Redirect to channel list
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to delete channel:", message);
      // Show error, maybe near the delete button or as a toast
      toast.error(`Failed to delete channel: ${message}`, {
        id: `delete-channel-${channelId}-error`,
        duration: 7000,
      });
      // Set page-level error or formError to display feedback if needed
      setError(message);
      setIsSubmitting(false); // Stop loading indicator on error
    }
  };

  // --- Render Logic ---
  if (isLoadingData) {
    return (
      <div>
        <PageTitle title="Edit Channel" />
        <LoadingIndicator text="Loading channel data..." />
      </div>
    );
  }

  // Show error if initial loading failed or channelId is invalid
  if (error || !channel) {
    return (
      <div>
        <PageTitle title="Edit Channel" />
        <ErrorMessage
          title="Error Loading Channel"
          message={error || "Could not load channel data or ID is invalid."}
        />
        <div className="mt-4 space-x-2">
          <Button onClick={fetchChannelData} variant="primary">
            Retry
          </Button>
          <Button
            variant="secondary"
            onClick={() => router(ROUTES.ADMIN_CHANNELS)}
          >
            Back to Channels
          </Button>
        </div>
      </div>
    );
  }

  // Render form if data loaded successfully
  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageTitle
          title={`Edit Channel: ${channel.name}`}
          subtitle={`ID: ${channel._id}`}
        />
        <div className="flex space-x-2 flex-shrink-0">
          <Button
            variant="secondary"
            onClick={() => router(ROUTES.ADMIN_CHANNELS)}
            disabled={isSubmitting}
          >
            Back to List
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteClick}
            isLoading={isSubmitting && isDeleteModalOpen} // Show loading only if delete is in progress *and* modal was open
            disabled={isSubmitting} // Disable if any action is submitting
          >
            Delete Channel
          </Button>
        </div>
      </div>

      {/* Channel Form */}
      <ChannelForm
        initialData={channel}
        onSubmit={handleSubmit}
        isLoading={isSubmitting && !isDeleteModalOpen} // Show loading on form submit button only if not deleting
        formError={formError} // Pass form-specific submission error
        isEditMode={true}
      />

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete the channel{" "}
            <strong className="text-text-primary">{channel.name}</strong>?
            <br />
            <span className="text-sm text-functional-warning">
              This action cannot be undone. Associated subscriptions might be
              affected depending on backend logic.
            </span>
          </>
        }
        confirmText="Yes, Delete Channel"
        confirmButtonVariant="danger"
        isLoading={isSubmitting && isDeleteModalOpen} // Show loading on confirm button during delete
      />
    </div>
  );
}
