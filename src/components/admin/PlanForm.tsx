// components/admin/PlanForm.tsx

import React, { useState } from "react";
import Input from "../../components/ui/Input";
import TextArea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import { Plan, PlanCreatePayload, PlanUpdatePayload } from "../../types";

interface PlanFormProps {
  initialData?: Plan | null;
  onSubmit: (
    data: Omit<PlanCreatePayload, "channel_id"> | PlanUpdatePayload | any
  ) => Promise<void>;
  isLoading: boolean;
  formError: string | null;
  isEditMode?: boolean;
}

const PlanForm: React.FC<PlanFormProps> = ({
  initialData,
  onSubmit,
  isLoading,
  formError,
  isEditMode = false,
}) => {
  const [name, setName] = useState(initialData?.name || "");

  const [markupPrice, setMarkupPrice] = useState<string>(
    initialData?.markup_price?.toString() ?? ""
  );
  const [discountedPrice, setDiscountedPrice] = useState<string | any>(
    initialData?.discounted_price?.toString() ?? null
  );
  const [validityDays, setValidityDays] = useState<string>(
    initialData?.validity_days?.toString() ?? ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const numMarkupPrice = markupPrice === "" ? null : Number(markupPrice);
    const numDiscountedPrice = Number(discountedPrice);
    const numValidity = Number(validityDays);

    if (!name.trim()) newErrors.name = "Plan name is required.";

    if (
      markupPrice !== "" &&
      (isNaN(numMarkupPrice ?? NaN) ||
        (numMarkupPrice !== null && numMarkupPrice < 0))
    ) {
      newErrors.markupPrice =
        "Markup price must be a valid non-negative number, or empty.";
    }

    if (discountedPrice !== "" && numDiscountedPrice < 0) {
      newErrors.discountedPrice =
        "Valid non-negative discounted price is required.";
    } else if (
      numMarkupPrice !== null &&
      numDiscountedPrice >= numMarkupPrice
    ) {
      newErrors.discountedPrice =
        "Discounted price must be less than the markup price.";
    }

    if (
      validityDays === "" ||
      isNaN(numValidity) ||
      numValidity <= 0 ||
      !Number.isInteger(numValidity)
    ) {
      newErrors.validityDays =
        "Validity must be a whole number of days greater than 0.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) {
      console.log("Plan form validation failed.");
      return;
    }

    const formData = {
      name: name.trim(),
      markup_price:
        markupPrice === "" || isNaN(Number(markupPrice))
          ? null
          : Number(markupPrice),
      discounted_price: discountedPrice && Number(discountedPrice),
      validity_days: Number(validityDays),
      description: description.trim() || null,
    };

    console.log("Form Data:", formData);
    // remove discounted price if its empty and markup price is not empty
    if (
      typeof formData.markup_price === "number" &&
      !formData.discounted_price
    ) {
      delete formData.discounted_price;
    }
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-2xl mx-auto bg-dark-secondary p-6 rounded-lg shadow-md border border-dark-tertiary"
    >
      <Input
        label="Plan Name"
        id="plan_name"
        name="planName"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          delete errors.name;
        }}
        required
        disabled={isLoading}
        error={errors.name}
        maxLength={100}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Markup Price (Required)"
          id="markup_price"
          name="markup_price"
          type="number"
          value={markupPrice}
          onChange={(e) => {
            setMarkupPrice(e.target.value);
            delete errors.markupPrice;
            delete errors.discountedPrice;
          }}
          required
          min={0}
          disabled={isLoading}
          error={errors.markupPrice}
          placeholder="e.g., 1000.00 (Original Price)"
        />
        <Input
          label="Discounted Price (Optional)"
          id="discounted_price"
          type="number"
          name="discountedPrice"
          value={discountedPrice}
          onChange={(e) => {
            setDiscountedPrice(e.target.value);
            delete errors.discountedPrice;
          }}
          // min={0}
          disabled={isLoading}
          error={errors.discountedPrice}
          placeholder="e.g., 800.00"
        />
      </div>
      <Input
        label="Validity (Days)"
        id="validity_days"
        name="validityDays"
        type="number"
        value={validityDays}
        onChange={(e) => {
          setValidityDays(e.target.value);
          delete errors.validityDays;
        }}
        required
        min={1}
        step={1}
        disabled={isLoading}
        error={errors.validityDays}
        placeholder="e.g., 30"
      />
      <TextArea
        label="Description (Optional)"
        id="description"
        name="description"
        value={description || ""}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        disabled={isLoading}
        maxLength={500}
      />
      {formError && (
        <ErrorMessage
          message={formError}
          className="my-4"
          title="Submission Error"
        />
      )}
      <Button
        type="submit"
        isLoading={isLoading}
        disabled={isLoading || Object.keys(errors).length > 0}
        className="w-full"
        variant="primary"
      >
        {isEditMode ? "Update Plan" : "Create Plan"}
      </Button>
      {!isLoading && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.history.back()}
          className="w-full mt-2"
        >
          Cancel
        </Button>
      )}
    </form>
  );
};

export default PlanForm;
