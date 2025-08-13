// app/(admin)/channels/page.tsx

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTitle from "../../../components/ui/PageTitle";
import Button from "../../../components/ui/Button";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import EmptyState from "../../../components/ui/EmptyState";
import ChannelListItem from "../../../components/admin/ChannelListItem";
import { getAdminChannels, getUserProfile } from "../../../lib/apiClient";
import { Channel, PopulatedChannel, UserProfile } from "../../../types";
import { getErrorMessage } from "../../../lib/utils";
import toast from "react-hot-toast";
import { ROUTES } from "../../../lib/constants";
import Modal from "../../../components/ui/Modal";
// Optional: Import an icon for EmptyState
const QrCode = require("../../../assets/giri_bot_qr.jpg")
export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<Channel[] | undefined | PopulatedChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal is open by default
  const router = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const closeModal = () => setIsModalOpen(false);
  const handleDone = () => {
    closeModal();
    router(ROUTES.ADMIN_CHANNELS); // Navigate after modal confirmation
  };
  // Separate loading/error states for actions
  const [, setTelegramError] = useState<string | null>(null);
  const [, setKycError] = useState<string | null>(null);
  // Memoized fetch function
  const fetchChannels = useCallback(async () => {
    console.log("Fetching admin channels...");
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminChannels(); // API returns channels owned by the admin
      setChannels(data);
      console.log(`Fetched ${data.length} channels.`);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to fetch channels:", message);
      setError(message);
      toast.error(`Error loading channels: ${message}`, {
        id: "fetch-channels-error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed

  // Initial fetch on mount
  useEffect(() => {
    fetchChannels();
  }, []);
  // Memoized function to fetch profile data
  const fetchProfile = useCallback(async () => {
    console.log("Fetching user profile...");
    setIsLoading(true);
    setError(null);
    setTelegramError(null); // Clear action errors on refresh
    setKycError(null);
    try {
      const data = await getUserProfile();

      setProfile(data);
      console.log("Profile fetched successfully.");
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to fetch profile:", message);
      setError(message); // Set page-level error
      toast.error(`Error loading profile: ${message}`, {
        id: "fetch-profile-error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies, fetches current user profile

  useEffect(() => {
    fetchProfile();
  }, []);
  // --- Render Logic ---
  const renderContent = () => {
    if (isLoading) {
      return <LoadingIndicator text="Loading your channels..." />;
    }

    if (error) {
      return (
        <div className="text-center">
          <ErrorMessage title="Error Loading Channels" message={error} />
          <Button onClick={fetchChannels} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    if (channels && channels.length === 0 || !channels) {
      return (
        <EmptyState
          message="You haven't added any channels yet."
        // icon={<FaPlusCircle className="text-4xl text-gray-500" />} // Example icon
        >
          {profile?.telegram_username && (
            <Button onClick={() => setIsModalOpen(true)} variant="primary" size="md">
              + Add Your First Channel
            </Button>

          )}

          {!profile?.telegram_username && (

            <Link to={ROUTES.ADMIN_PROFILE}
              onClick={() => {
                toast.error(`Please Link your Telegram Username to proceed`);

              }}
              className="flex-shrink-0">
              <Button variant="primary" size="md">
                + Add Telegram Id to add channel
              </Button>
            </Link>
          )}
        </EmptyState>
      );
    }

    // Display list of channels
    return (
      <div className="space-y-4">
        {channels && channels.map((channel, index) => (
          <ChannelListItem key={index} channel={channel} />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageTitle
          title="My Channels"
          subtitle="Manage your Telegram channels and their settings."
        />
        {/* Show Create button only if not loading and no error, or if list has items */}
        {!isLoading && !error && profile?.telegram_username && (
          // <Link to={ROUTES.ADMIN_CHANNEL_NEW} className="flex-shrink-0" >
          <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
            + Add Channel
          </Button>
        )}
        {/* </Link> */}
        {!profile?.telegram_username && (
          <Link to={ROUTES.ADMIN_PROFILE} onClick={() => {
            toast.error(`Please Link your Telegram Username to proceed`);

          }} className="flex-shrink-0">
            <Button variant="primary" size="md">
              + Add Telegram Id to add channel
            </Button>
          </Link>
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add Telegram Channel"
        size="xl"
      >
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            To add a channel, follow these steps:
          </h2>
          <ol className="list-decimal list-inside space-y-6 text-text-secondary">
            <li className="flex flex-col items-center justify-center text-center space-y-4">
              <p>
                Add our Telegram bot
                <span className="text-golden-accent font-mono px-2">
                  @livelong_wealth_telegram_bot
                </span>
                to your channel
              </p>

              <div className="text-sm font-semibold text-gray-500">OR</div>

              <div className="flex flex-col items-center mt-2">
                <p>Scan this QR code</p>
                <img src={QrCode} alt="QR code for Telegram bot" className="h-80  w-auto mt-2" />
              </div>
            </li>

            <li className="text-center">Make it an administrator</li>

            <li className="text-center">
              <Button onClick={handleDone} variant="secondary">
                Click Here When Done
              </Button>
            </li>
          </ol>

        </div>
      </Modal >
      {/* Content Area */}
      < div className="bg-dark-secondary p-4 md:p-6 rounded-lg shadow-md min-h-[200px] flex flex-col justify-center" >
        {renderContent()}
      </div >
    </div >
  );
}
