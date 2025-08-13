// components/user/KycSection.tsx
import React from "react";
import KycForm from "./KycForm";
import { KycFormData, UserProfile } from "../../types";
import { formatDate } from "../../lib/utils";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import DateOfBirthInput from "../ui/DateOfBirthInput";

interface KycSectionProps {
  isKycSubmitted: boolean | undefined;
  kycSubmissionDate?: string | null;
  onSubmit: (data: KycFormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  profile: UserProfile | null;
  isProfile?: boolean;
}

const KycSection: React.FC<KycSectionProps> = ({
  isKycSubmitted,
  kycSubmissionDate,
  onSubmit,
  profile,
  isLoading,
  error,
  isProfile = true,
}) => {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    onSubmit({
      pan_number: profile.pan_number || "",
      aadhar_number: profile.aadhar_number || "",
      dob: profile.dob || "",
    });
    window.location.reload()

  };

  return (
    <div className="bg-dark-secondary p-6 rounded-2xl shadow-lg max-w-md">
      <h2 className="text-xl font-semibold text-text-primary mb-5">
        KYC Verification
      </h2>

      {isKycSubmitted ? (
        <div className="space-y-4">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-functional-success mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium text-functional-success">
              KYC Details Submitted
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <Input
              label="PAN Number"
              id="pan_number"
              name="pan_number"
              value={profile?.pan_number || ""}
              disabled
            />

            <Input
              label="Aadhaar Number"
              id="aadhar_number"
              name="aadhar_number"
              value={profile?.aadhar_number || ""}
              disabled
            />

            {profile && (
              <DateOfBirthInput
                label="Date of Birth"
                id="dob"
                name="dob"
                value={new Date(profile.dob).toISOString().split("T")[0]}
                disabled
              />
            )}

            {!isProfile && (
              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full mt-2"
                variant="primary"
              >
                Submit KYC Details
              </Button>
            )}

            {kycSubmissionDate && (
              <p className="text-sm text-text-secondary mt-2">
                Submitted on: {formatDate(kycSubmissionDate)}
              </p>
            )}
          </form>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-secondary mb-4">
            Submit your PAN and Aadhaar details for identity verification.
            Required for enhanced access.
          </p>

          <KycForm
            onSubmit={onSubmit}
            isLoading={isLoading}
            submissionError={error}
          />
        </>
      )}
    </div>
  );
};

export default KycSection;
