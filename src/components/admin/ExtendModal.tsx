// components/admin/ExtendModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { SubscriptionAdminResponse } from "../../types";
import { formatDate } from "../../lib/utils";

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (extensionDays: number) => Promise<void>;
  isLoading: boolean;
  subscription: SubscriptionAdminResponse | null;
}

const ExtendModal: React.FC<ExtendModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  subscription,
}) => {
  const [days, setDays] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    const numDays = Number(days);

    if (isNaN(numDays) || numDays <= 0 || !Number.isInteger(numDays)) {
      setError("Please enter a valid whole number of days (greater than 0).");
      return;
    }

    try {
      await onConfirm(numDays);
      // Parent handles closing modal on success
    } catch (err) {
      // Parent handles error display (toast/message)
      console.error("Error during confirm extend (handled by parent):", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDays("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !subscription) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Extend Subscription`}
      size="sm"
    >
      <div className="space-y-6">
        {/* Display basic sub info */}
        <div className="bg-dark-tertiary p-3 rounded text-sm border border-dark-border">
          <p className="text-text-secondary mb-1">
            <span className="font-semibold text-text-primary">User:</span>{" "}
            {subscription.user_phone || "N/A"}
          </p>
          <p className="text-text-secondary mb-1">
            <span className="font-semibold text-text-primary">Plan:</span>{" "}
            {subscription.plan_name ||
              (typeof subscription.plan_id === "object"
                ? subscription.plan_id.name
                : subscription.plan_id) ||
              "N/A"}
          </p>
          {/* Handle plan_id object or string */}
          <p className="text-text-secondary">
            <span className="font-semibold text-text-primary">
              Current End Date:
            </span>{" "}
            {formatDate(subscription.end_date)}
          </p>
        </div>
        {/* Input field for extension days */}
        <Input
          label="Number of Days to Extend By"
          id="extension_days"
          name="extension_days"
          type="number"
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g., 30"
          min={1}
          step={1}
          disabled={isLoading}
          required
          error={error}
        />
        {/* Modal Footer with Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-dark-tertiary">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={
              isLoading ||
              days === "" ||
              Number(days) <= 0 ||
              !Number.isInteger(Number(days))
            }
          >
            Extend Subscription
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExtendModal;
