// components/user/UpgradeModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import LoadingIndicator from "../../components/ui/LoadingIndicator";
import ErrorMessage from "../../components/ui/ErrorMessage";
import { UserSubscription, Plan } from "../../types";
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubscription: UserSubscription;
  upgradeOptions: Plan[];
  onConfirmUpgrade: (selectedNewPlanId: string) => void;
  isLoadingOptions: boolean;
  isLoadingConfirm: boolean;
  error?: string | null;
}
const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentSubscription,
  upgradeOptions,
  onConfirmUpgrade,
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
      onConfirmUpgrade(selectedPlanId);
    }
  };
  const planSelectOptions = upgradeOptions.map((plan) => ({
    value: plan._id,
    label: `${plan.name} - ₹${plan.discounted_price ?? plan.markup_price} (${
      plan.validity_days
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
      title={`Extend Subscription: ${
        typeof currentSubscription.channel_id === "object"
          ? currentSubscription.channel_id.name
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
              ` (₹${
                currentPlan.discounted_price ?? currentPlan.markup_price
              }, ${currentPlan.validity_days} days)`}
          </p>
        </div>
        {isLoadingOptions && (
          <div className="flex justify-center py-4">
            <LoadingIndicator text="Loading available extend plans..." />
          </div>
        )}
        {!isLoadingOptions && error && (
          <ErrorMessage message={error} className="my-2" />
        )}
        {!isLoadingOptions && !error && upgradeOptions.length === 0 && (
          <p className="text-center text-text-secondary italic py-4">
            No plans available for upgrade at this time.
          </p>
        )}
        {!isLoadingOptions && !error && upgradeOptions.length > 0 && (
          <Select
            label="Select New Plan to Extend To"
            options={planSelectOptions}
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            placeholder="-- Choose an plan --"
            disabled={isLoadingConfirm}
            required
            name="new_plan_id"
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
              upgradeOptions.length === 0
            }
          >
            Confirm & Proceed
          </Button>
        </div>
      </div>
    </Modal>
  );
};
export default UpgradeModal;
