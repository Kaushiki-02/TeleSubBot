// components/user/KycPromptModal.tsx
import React, { useCallback, useEffect, useState } from "react";
import { KycFormData, UserProfile, UserSubscription } from "../../types";
import KycSection from "../user/KycSection";
import toast from "react-hot-toast";
import { getUserProfile, submitKycsub } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/utils";
import LoadingIndicator from "../ui/LoadingIndicator";
import ErrorMessage from "../ui/ErrorMessage";
import Modal from "../ui/Modal";
type KycPromptContext = "signup" | "payment";
interface KycPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: KycPromptContext;
  sub: UserSubscription | null | undefined;
}
const KycPromptModal: React.FC<KycPromptModalProps> = ({
  isOpen,
  onClose,
  sub,
}) => {
  const { updateAuthUser } = useAuth();
  const title = "KYC Verification Required";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [isKycLoading, setIsKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    setErrorProfile(null);
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to fetch profile in modal:", message);
      setErrorProfile(message);
      toast.error(`Error loading profile for KYC: ${message}`);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);
  const handleSubmitKyc = async (formData: KycFormData) => {
    setIsKycLoading(true);
    setKycError(null);
    let newformdata = formData;
    newformdata.subid = sub?._id;
    try {
      await submitKycsub(newformdata);
      toast.success("KYC details submitted successfully!");
      updateAuthUser({ isKycSubmitted: true });
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to submit KYC:", message);
      setKycError(message);
      toast.error(`Failed to submit KYC: ${message}`);
    } finally {
      setIsKycLoading(false);
    }
  };
  useEffect(() => {
    console.log("KycPromptModal useEffect");
    // Fetch profile only if the modal is open and profile is not already loaded
    if (isOpen && !profile) {
      fetchProfile();
    }
    // If modal closes or profile loaded, clear error
    if (!isOpen || profile) {
      setKycError(null);
    }
  }, [isOpen, profile, isLoadingProfile]);
  // }, [isOpen, profile, isLoadingProfile, fetchProfile]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {isLoadingProfile ? (
        <div className="flex justify-center py-10">
          <LoadingIndicator text="Loading profile..." />
        </div>
      ) : errorProfile ? (
        <div className="py-10">
          <ErrorMessage message={errorProfile} title="Profile Load Error" />
        </div>
      ) : (
        <div className="space-y-4">
          <KycSection
            isKycSubmitted={profile?.isKycSubmitted ?? false} // Ensure boolean default
            kycSubmissionDate={profile?.kycSubmittedAt}
            profile={profile}
            onSubmit={handleSubmitKyc}
            isLoading={isKycLoading}
            isProfile={false}
            error={kycError}
          />
        </div>
      )}
    </Modal>
  );
};
export default KycPromptModal;
