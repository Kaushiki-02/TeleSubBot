import { useState, useEffect, useCallback } from "react";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import UserInfoDisplay from "../../../components/user/UserInfoDisplay";
import TelegramLinkForm from "../../../components/user/TelegramLinkForm";
import Button from "../../../components/ui/Button";
import {
  getUserProfile,
  linkTelegramUsername,
  submitKyc,
} from "../../../lib/apiClient";
import { UserProfile, KycFormData, TelegramFormData } from "../../../types";
import { getErrorMessage } from "../../../lib/utils";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

export default function UserProfilePage() {
  const { updateAuthUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [isKycLoading, setIsKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    console.log("Fetching user profile...");
    setIsLoading(true);
    setError(null);
    setTelegramError(null);
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

  const handleLinkTelegram = async (formData: TelegramFormData) => {
    setIsTelegramLoading(true);
    setTelegramError(null);
    try {
      await linkTelegramUsername(formData);
      toast.success("Telegram username updated successfully!", {
        id: "tg-link-success",
      });
      await fetchProfile();
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to link Telegram:", message);
      setTelegramError(message);
      toast.error(`Failed to link Telegram: ${message}`, {
        id: "tg-link-error",
      });
    } finally {
      setIsTelegramLoading(false);
    }
  };

  const handleSubmitKyc = async (formData: KycFormData) => {
    setIsKycLoading(true);
    setKycError(null);
    try {
      await submitKyc(formData);
      toast.success("KYC details submitted successfully!", {
        id: "kyc-submit-success",
      });

      updateAuthUser({ isKycSubmitted: true });
      console.log("Auth context state updated with KYC status.");
      await fetchProfile();
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to submit KYC:", message);
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
      <div className="space-y-6 md:space-y-8">
        <PageTitle title="My Profile" />
        <div className="flex justify-center items-center py-10">
          <LoadingIndicator size="lg" text="Loading your profile..." />{" "}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6 md:space-y-8">
        <PageTitle title="My Profile" />
        <div className="py-10">
          <ErrorMessage
            title="Error Loading Profile"
            message={error || "Could not load profile data."}
          />
        </div>
        <div className="flex justify-center">
          <Button onClick={fetchProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageTitle
        title="My Profile"
        subtitle="View and update your account details."
      />
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:basis-3/5 md:flex md:flex-col md:h-full">
          <UserInfoDisplay profile={profile} isadmin={true} />
        </div>
        <div className="md:basis-2/5 md:flex md:flex-col md:h-full">
          <TelegramLinkForm
            currentUsername={profile.telegram_username || null}
            onSubmit={handleLinkTelegram}
            isLoading={isTelegramLoading}
            error={telegramError}
            profile={profile}
          />
        </div>
      </div>
    </div>
  );
}
