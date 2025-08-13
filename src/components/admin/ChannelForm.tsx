// components/admin/ChannelForm.tsx
// Uses state and effects

import React, { useState, useEffect } from "react";
import Input from "../../components/ui/Input";
import TextArea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import {
  Channel,
  ChannelCreatePayload,
  ChannelUpdatePayload,
} from "../../types";
// Assuming API functions are correctly defined in apiClient
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

interface ChannelFormProps {
  initialData?: Channel | null;
  onSubmit: (
    data: ChannelCreatePayload | ChannelUpdatePayload
  ) => Promise<void>;
  isLoading: boolean;
  formError: string | null;
  isEditMode?: boolean;
}

const ChannelForm: React.FC<ChannelFormProps> = ({
  initialData,
  onSubmit,
  isLoading,
  formError,
  isEditMode = false,
}) => {
  // --- Form Field State ---
  const [name, setName] = useState(initialData?.name || "");
  const [telegramChatId, setTelegramChatId] = useState(
    initialData?.telegram_chat_id || ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  const [reminderTemplateOverrideId] = useState<string | null>(
    initialData?.reminder_template_override_id || null
  );
  // Use string for number input state to handle empty input correctly
  const [reminderDaysOverride, setReminderDaysOverride] = useState<string>(
    initialData?.reminder_days_override?.toString() ?? ""
  );
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [couponCode, setCouponCode] = useState(initialData?.couponCode || "");
  const [couponDiscount, setCouponDiscount] = useState<string>(
    initialData?.couponDiscount?.toString() ?? ""
  );

  // --- State for Local Validation ---
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // --- Validation Logic ---
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Channel name is required.";
    if (!telegramChatId.trim())
      errors.telegramChatId = "Telegram Chat ID or Username is required.";
    // Basic check for Telegram ID/Username format (@username or -100xxxx)
    if (
      telegramChatId.trim() &&
      !/^([@a-zA-Z0-9_]{5,32}|-100\d{9,13})$/.test(telegramChatId.trim())
    ) {
      errors.telegramChatId =
        "Invalid format. Use @username (5-32 chars) or numeric ID (starts with -100).";
    }
    // Validate reminder days override if provided and not empty
    if (
      reminderDaysOverride !== "" &&
      (isNaN(Number(reminderDaysOverride)) || Number(reminderDaysOverride) < 0)
    ) {
      errors.reminderDaysOverride =
        "Reminder days must be a non-negative number.";
    }
    // Validate coupon code if provided and not empty
    if (couponCode.trim() !== "" && couponCode.trim().length < 6) {
      errors.couponCode = "Coupon code must be at least 6 characters.";
    }
    // Validate coupon discount if provided and not empty
    if (
      couponDiscount.trim() !== "" &&
      (isNaN(Number(couponDiscount)) ||
        Number(couponDiscount) < 0 ||
        Number(couponDiscount) > 100)
    ) {
      errors.couponDiscount = "Discount percentage must be between 0 and 100.";
    } else if (couponDiscount.trim() === "" && couponCode.trim() !== "") {
      errors.couponDiscount =
        "Discount is required if coupon code is provided.";
    } else if (couponDiscount.trim() !== "" && couponCode.trim() === "") {
      errors.couponCode = "Coupon code is required if discount is provided.";
    }

    setValidationErrors(errors); // Update validation state
    return Object.keys(errors).length === 0; // Return true if no errors
  };

  // --- Form Submission Handler ---
  const handleSubmit = (e: React.FormEvent) => {
    console.log("Submitting channel form...");
    e.preventDefault(); // Prevent default browser submission
    setValidationErrors({}); // Clear previous validation errors

    // Validate form before submitting
    if (!validateForm()) {
      console.log("Channel form validation failed.");
      return;
    }

    // Prepare form data payload
    const daysOverrideValue =
      reminderDaysOverride === "" ? null : Number(reminderDaysOverride);
    const couponDiscountValue =
      couponDiscount === "" ? 0 : Number(couponDiscount);

    const formData: ChannelCreatePayload | ChannelUpdatePayload = {
      name: name.trim(),
      telegram_chat_id: telegramChatId.trim(),
      description: description.trim() || null, // Send null if empty after trimming
      // associated_plan_ids: associatedPlanIds,
      reminder_template_override_id: reminderTemplateOverrideId || null,
      reminder_days_override: daysOverrideValue,
      is_active: isActive,
      couponDiscount: couponDiscountValue,
      couponCode: couponCode.trim() || null,
    };
    console.log(formData);

    // Call the parent's onSubmit handler
    onSubmit(formData);
  };
  // --- Render Form ---
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl mx-auto bg-dark-secondary p-8 rounded-lg shadow-md border border-dark-tertiary" // Increased padding and spacing
    >
      {/* Overall Form Error */}
      {formError && (
        <ErrorMessage
          message={formError}
          className="mb-4" // Use mb for spacing before content
          title="Submission Error"
        />
      )}

      {/* Basic Channel Info Section */}
      <div className="space-y-4">
        <Input
          label="Channel Name"
          id="channel-name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setValidationErrors({ ...validationErrors, name: undefined }); // Clear specific error on change
          }}
          required
          disabled={isLoading}
          error={validationErrors.name}
          maxLength={100}
        />
        <Input
          label="Telegram Chat ID or Username"
          id="telegram-chat-id"
          name="telegram_chat_id"
          value={telegramChatId}
          onChange={(e) => {
            setTelegramChatId(e.target.value);
            setValidationErrors({
              ...validationErrors,
              telegramChatId: undefined,
            });
          }}
          placeholder="-100123456789 or @mychannelhandle"
          required
          disabled={isEditMode && initialData?.telegram_chat_id !== undefined}
          error={validationErrors.telegramChatId}
        />
        <TextArea
          label="Description (Optional)"
          id="channel-description"
          name="description"
          value={description || ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isLoading}
          maxLength={500}
        />
      </div>

      {/* Reminder Overrides Section */}
      <fieldset className="pt-6 border-t border-dark-tertiary">
        {" "}
        {/* Increased padding */}
        <legend className="text-sm font-semibold text-text-secondary mb-4">
          {" "}
          {/* Increased margin */}
          Reminder Overrides (Optional)
        </legend>
        {/* Use grid for horizontal alignment on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Reminder Days Override"
            id="reminder-days-override"
            name="reminder_days_override"
            type="number"
            value={reminderDaysOverride}
            onChange={(e) => {
              setReminderDaysOverride(e.target.value);
              setValidationErrors({
                ...validationErrors,
                reminderDaysOverride: undefined,
              });
            }}
            placeholder="e.g., 3 (days before expiry) Default 2"
            min={0}
            disabled={isLoading}
            error={validationErrors.reminderDaysOverride}
          />
        </div>
      </fieldset>

      {/* Coupons Section */}
      <fieldset className="pt-6 border-t border-dark-tertiary">
        <legend className="text-sm font-semibold text-text-secondary mb-4">
          Coupons (Optional)
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Coupon Code"
            id="coupon-code"
            name="couponCode" // Use simple name
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setValidationErrors({
                ...validationErrors,
                couponCode: undefined,
              });
            }}
            placeholder="6+ alphanumeric unique code"
            disabled={isLoading}
            error={validationErrors.couponCode}
          />
          {/* Coupon Discount Input */}
          <Input
            label="Coupon Discount (%)"
            type="number"
            id="coupon-discount"
            name="couponDiscount"
            min={0}
            max={100}
            value={couponDiscount}
            onChange={(e) => {
              setCouponDiscount(e.target.value);
              setValidationErrors({
                ...validationErrors,
                couponDiscount: undefined,
              });
            }}
            placeholder="0-100"
            disabled={isLoading}
            error={validationErrors.couponDiscount}
          />
        </div>
      </fieldset>

      {/* Active Toggle (Only in Edit Mode) */}
      {isEditMode && (
        <div className="pt-6 border-t border-dark-tertiary">
          {/* Increased padding */}
          <label
            htmlFor="is-active"
            className="text-sm font-medium text-text-secondary flex items-center cursor-pointer"
          >
            <input
              type="checkbox"
              id="is-active"
              className="form-checkbox h-4 w-4 text-golden-accent rounded mr-2 focus:ring-golden-focus-ring bg-dark-tertiary border-dark-border checked:bg-golden-accent checked:border-transparent focus:ring-offset-dark-primary" // Styled checkbox
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isLoading}
            />
            Channel is Active
          </label>
          <p className="text-xs text-text-secondary mt-1">
            Inactive channels cannot be subscribed to publicly via referral
            links.
          </p>
        </div>
      )}

      {/* Bot Setup Instructions */}
      <div className="pt-6 border-t border-dark-tertiary">
        <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center">
          <FontAwesomeIcon
            icon={faInfoCircle}
            className="mr-2 text-functional-info flex-shrink-0"
          />
          {/* Added info icon */}
          Bot Setup Instructions
        </h3>
        <p className="text-xs text-text-secondary bg-dark-primary/50 p-3 rounded border border-dark-border">
          {/* Used bg-dark-primary/50 and dark-border for distinction */}
          To enable automated subscription management, add the CRM bot (
          <strong className="text-text-primary font-medium">
            @YourActualBotUsername
          </strong>{" "}
          - *replace this*) to this Telegram channel/group. Grant it
          administrator permissions, specifically the ability to **Ban Users**
          (this is used to remove expired subscribers automatically).
        </p>
      </div>

      {/* Form Action Buttons */}
      <div className="flex flex-col gap-2 pt-4">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
          variant="primary"
        >
          {isEditMode ? "Update Channel" : "Create Channel"}
        </Button>
        {/* Optional: Back/Cancel Button */}
        {!isLoading && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.history.back()}
            className="w-full"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default ChannelForm;
