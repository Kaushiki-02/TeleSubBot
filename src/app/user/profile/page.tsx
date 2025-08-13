// app/(user)/profile/page.tsx
import { useState, useEffect, useCallback } from "react";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import UserInfoDisplay from "../../../components/user/UserInfoDisplay";

import KycSection from "../../../components/user/KycSection";
import Button from "../../../components/ui/Button";
import { getUserProfile, submitKyc } from "../../../lib/apiClient";
import { UserProfile, KycFormData } from "../../../types";
import { getErrorMessage } from "../../../lib/utils";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

export default function UserProfilePage() {
  const { updateAuthUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isKycLoading, setIsKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    console.log("Fetching user profile...");
    setIsLoading(true);
    setError(null);

    setKycError(null);
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to fetch profile:", message);
      setError(message);
      toast.error(`Error loading profile: ${message}`, {
        id: "fetch-profile-error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmitKyc = async (formData: KycFormData) => {
    setIsKycLoading(true);
    setKycError(null);
    try {
      const fullKycPayload: KycFormData = {
        pan_number: formData.pan_number,
        aadhar_number: formData.aadhar_number,
        dob: formData.dob,
      };

      await submitKyc(fullKycPayload);

      toast.success("KYC details submitted successfully! Thank you.", {
        id: "kyc-submit-success",
      });

      updateAuthUser({ isKycSubmitted: true });
      await fetchProfile();
    } catch (err) {
      const message = getErrorMessage(err);
      setKycError(message);
      toast.error(`Failed to submit KYC: ${message}`, {
        id: "kyc-submit-error",
      });
    } finally {
      setIsKycLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8">
        {" "}
        {/* Add padding for gutter */}
        <PageTitle title="My Profile" />
        <div className="flex justify-center py-10">
          <LoadingIndicator text="Loading your profile..." />{" "}
          {/* Adjust path if necessary */}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8">
        {" "}
        {/* Add padding for gutter */}
        <PageTitle title="My Profile" />
        <div className="py-10">
          <ErrorMessage
            title="Error Loading Profile"
            message={error || "Could not load profile data."}
          />
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={fetchProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 space-y-6 md:space-y-8">
      {" "}
      {/* Add padding for gutter and vertical spacing */}
      <PageTitle
        title="My Profile"
        subtitle="Manage your account details and linked services."
      />
      {/* Top Section: User Info (now full width) */}
      {/* Removed the flex container that held UserInfo and Telegram */}
      <UserInfoDisplay profile={profile} isadmin={false} />{" "}
      {/* UserInfoDisplay takes full width by default in its container */}
      {/* Bottom Section: KYC */}
      {/* Centered, max-width container for KYC */}
      <div className="max-w-lg mx-start w-full">
        {/* Adjusted max-width for KYC section */}
        <KycSection
          isKycSubmitted={profile.isKycSubmitted}
          kycSubmissionDate={profile.kycSubmittedAt}
          onSubmit={handleSubmitKyc}
          profile={profile}
          isLoading={isKycLoading}
          error={kycError}
        />
      </div>
    </div>
  );
}
