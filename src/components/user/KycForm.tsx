// components/user/KycForm.tsx
import React, { useState } from "react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import DateOfBirthInput from "../ui/DateOfBirthInput";
import { KycFormData } from "../../types";
import { isValidPAN, isValidAadhaar } from "../../lib/utils";

interface KycFormProps {
  onSubmit: (data: KycFormData) => Promise<void>;
  isLoading: boolean;
  submissionError: string | null;
}

const KycForm: React.FC<KycFormProps> = ({
  onSubmit,
  isLoading,
  submissionError,
}) => {
  const [pan, setPan] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [dob, setDob] = useState("");

  const [panError, setPanError] = useState<string | null>(null);
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);

  const validatePAN = (value: string): boolean => {
    setPanError(null);
    if (!value.trim()) {
      setPanError("PAN Number is required.");
      return false;
    }
    if (!isValidPAN(value.trim())) {
      setPanError("Invalid PAN format (e.g., ABCDE1234F).");
      return false;
    }
    return true;
  };

  const validateAadhaar = (value: string): boolean => {
    setAadhaarError(null);
    if (!value.trim()) {
      setAadhaarError("Aadhaar Number is required.");
      return false;
    }
    if (!isValidAadhaar(value.trim())) {
      setAadhaarError("Invalid Aadhaar format (must be 12 digits).");
      return false;
    }
    return true;
  };

  const validateDob = (value: string): boolean => {
    setDobError(null);
    if (!value) {
      setDobError("Date of Birth is required.");
      return false;
    }

    const dobDate = new Date(value);
    const today = new Date();
    const hundredYearsAgo = new Date(
      today.getFullYear() - 100,
      today.getMonth(),
      today.getDate()
    );
    const tenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );

    if (isNaN(dobDate.getTime())) {
      setDobError("Invalid date format.");
      return false;
    }

    if (dobDate > today) {
      setDobError("Date of Birth cannot be in the future.");
      return false;
    }

    if (dobDate > tenYearsAgo) {
      setDobError("You must be at least 18 years old.");
      return false;
    }
    if (dobDate < hundredYearsAgo) {
      setDobError("Date of Birth cannot be more than 100 years ago.");
      return false;
    }

    return true;
  };

  // --- Input Change Handlers ---
  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setPan(val);
    if (panError) setPanError(null);
  };
  // Verhoeff algorithm tables
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];

  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

  function validateVerhoeff(num: string): boolean {
    let c = 0;
    const reversed = num.split('').reverse().map(Number);
    for (let i = 0; i < reversed.length; i++) {
      c = d[c][p[i % 8][reversed[i]]];
    }
    return c === 0;
  }

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAadhaar(val);

    if (aadhaarError) setAadhaarError(null);

    if (val.length === 12 && !validateVerhoeff(val)) {
      setAadhaarError("Invalid Aadhaar number");
    }
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value; // YYYY-MM-DD string
    setDob(selectedDate);
    if (dobError) setDobError(null);
  };

  // --- Input Blur Handlers (Validate on losing focus) ---
  const handlePanBlur = () => {
    validatePAN(pan);
  };
  const handleAadhaarBlur = () => {
    validateAadhaar(aadhaar);
  };
  const handleDobBlur = () => {
    validateDob(dob);
  };

  // --- Form Submission Handler ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Perform final validation check on submit for all fields
    const isPanValid = validatePAN(pan);
    const isAadhaarValid = validateAadhaar(aadhaar);
    const isDOBValid = validateDob(dob);

    // If all inputs are valid, call the parent's onSubmit handler
    if (isPanValid && isAadhaarValid && isDOBValid) {
      onSubmit({
        pan_number: pan.trim(), // Use trimmed values
        aadhar_number: aadhaar.trim(),
        dob: dob, // DOB value is already YYYY-MM-DD string or empty
      });
    } else {
      console.log("KYC Form validation failed.");
      // Errors are already set by validate functions on blur/submit
    }
  };

  // Check if form is valid based on current state errors
  const isFormValid =
    !panError &&
    !aadhaarError &&
    !dobError &&
    pan.trim() !== "" &&
    aadhaar.trim() !== "" &&
    dob !== "";

  return (
    // Form container
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-text-secondary">
        Submit your PAN, Aadhaar, and Date of Birth details for identity
        verification. Required for enhanced access.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="PAN Number"
          id="pan_number"
          name="pan_number"
          value={pan}
          onChange={handlePanChange}
          onBlur={handlePanBlur}
          placeholder="ABCDE1234F"
          disabled={isLoading}
          required
          error={panError}
          maxLength={10}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <Input
          label="Aadhaar Number"
          id="aadhar_number"
          name="aadhar_number"
          type="tel"
          inputMode="numeric"
          value={aadhaar}
          onChange={handleAadhaarChange}
          onBlur={handleAadhaarBlur}
          placeholder="12 digits"
          disabled={isLoading}
          required
          error={aadhaarError}
          maxLength={12}
          autoComplete="off"
        />
      </div>
      {/* Date of Birth Input - Use the new component */}
      <DateOfBirthInput
        label="Date of Birth" // Use the default label
        id="dob"
        name="dob"
        value={dob} // Pass the YYYY-MM-DD string value
        onChange={handleDobChange} // Handle change
        onBlur={handleDobBlur} // Validate on blur
        disabled={isLoading}
        required
        error={dobError} // Pass validation error
      />
      {/* Display API Submission Error */}
      {submissionError && (
        <ErrorMessage message={submissionError} className="mt-4" />
      )}
      {/* Submit Button - Aligned Right */}
      <div className="flex justify-end mt-6">
        {" "}
        {/* Container to align button */}
        <Button
          type="submit"
          isLoading={isLoading}
          // Disable button if loading OR form is not valid
          disabled={isLoading || !isFormValid}
          variant="primary"
          className="w-full sm:w-auto max-w-[200px]" // Restrain button width
        >
          Submit KYC Details
        </Button>
      </div>
    </form>
  );
};

export default KycForm;
