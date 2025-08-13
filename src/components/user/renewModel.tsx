// components/user/RenewModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import LoadingIndicator from "../../components/ui/LoadingIndicator";
import ErrorMessage from "../../components/ui/ErrorMessage";
import { UserSubscription, Plan } from "../../types";
interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubscription: UserSubscription;
  renewOptions: Plan[];
  onConfirmRenew: (selectedPlanId: string) => void;
  isLoadingOptions: boolean;
  isLoadingConfirm: boolean;
  error: string | null;
}
const RenewModal: React.FC<RenewModalProps> = ({
  isOpen,
  onClose,
  currentSubscription,
  renewOptions,
  onConfirmRenew,
  isLoadingOptions,
  isLoadingConfirm,
  error,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  useEffect(() => {
    if (isOpen) {
      setSelectedPlanId("");
    }
  }, [isOpen]);
  const handleConfirm = () => {
    if (selectedPlanId) {
      onConfirmRenew(selectedPlanId);
    }
  };
  const planSelectOptions = renewOptions.map((plan) => ({
    value: plan._id,
    label: `${plan.name} - ₹${plan.discounted_price ?? plan.markup_price} (${plan.validity_days
      } days)`,
  }));
  const currentPlan =
    typeof currentSubscription.plan_id === "object"
      ? currentSubscription.plan_id
      : null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Renew Subscription: ${typeof currentSubscription.channel_id === "object"
        ? currentSubscription.channel_id?.name
        : "Channel"
        }`}
      size="md"
    >
      <div className="space-y-6">
        <div className="bg-dark-tertiary p-3 rounded text-sm border border-dark-border">
          <p className="text-text-secondary mb-1">
            Current Plan:{" "}
            <span className="font-medium text-text-primary">
              {currentPlan?.name || "N/A"}
            </span>
            {currentPlan &&
              ` (₹${currentPlan.discounted_price ?? currentPlan.markup_price
              }, ${currentPlan.validity_days} days)`}
          </p>
        </div>
        {isLoadingOptions && (
          <div className="flex justify-center py-4">
            <LoadingIndicator text="Loading renewal options..." />
          </div>
        )}
        {!isLoadingOptions && error && (
          <ErrorMessage message={error} className="my-2" />
        )}
        {!isLoadingOptions && !error && renewOptions.length === 0 && (
          <p className="text-center text-text-secondary italic py-4">
            No plans available for renewal at this time.
          </p>
        )}
        {!isLoadingOptions && !error && renewOptions.length > 0 && (
          <Select
            label="Select Plan to Renew"
            options={planSelectOptions}
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            placeholder="-- Choose a plan --"
            disabled={isLoadingConfirm}
            required
            name="renew_plan_id"
          />
        )}
        <div className="flex justify-end space-x-3 pt-6 border-t border-dark-tertiary">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoadingConfirm}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleConfirm}
            isLoading={isLoadingConfirm}
            disabled={
              isLoadingOptions ||
              isLoadingConfirm ||
              !selectedPlanId ||
              renewOptions.length === 0
            }
          >
            Confirm & Renew
          </Button>
        </div>
      </div>
    </Modal>
  );
};
export default RenewModal;
