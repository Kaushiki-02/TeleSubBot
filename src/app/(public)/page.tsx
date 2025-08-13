// app/public/channel/[referralCode]/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import PageTitle from "../../components/ui/PageTitle";
import LoadingIndicator from "../../components/ui/LoadingIndicator";
import ErrorMessage from "../../components/ui/ErrorMessage";
import Button from "../../components/ui/Button";
import KycPromptModal from "../../components/user/KycPromptModal"; // Import modal
import {
  getPublicChannelByReferralCode,
  initiateSubscribe,
} from "../../lib/apiClient"; // New API client function
import {
  PopulatedChannel,
  Plan,
  InitiateTransactionOrderResponse,
} from "../../types"; // Use PopulatedChannel
import { getErrorMessage, loadRazorpayScript } from "../../lib/utils";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext"; // Get auth state
import { ROUTES } from "../../lib/constants";
import { storeRedirectUrl } from "../../lib/auth"; // Store redirect URL
import FaqSection from "../../components/ui/FaQList";
import PlanCard from "../../components/user/plansCard";

// Declare Razorpay type globally if not already in user/my-groups/page.tsx
// declare global { interface Window { Razorpay: any; } }

export default function PublicChannelPage() {
  const router = useNavigate();

  const location = useLocation();
  const params = useParams();
  const searchParams = new URLSearchParams(location.search);
  const referralCode = params.referralCode as string;
  const copCode = searchParams.get("couponCode") || "";

  const { isAuthenticated, user } = useAuth(); // Get auth state and user details

  const [channel, setChannel] = useState<PopulatedChannel | null>(null); // Store fetched channel with populated plans
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
  const [error, setError] = useState<string | null>(null); // Error fetching data
  const [, setSubActionLoadingState] = useState<{ [subId: string]: boolean }>(
    {}
  );

  const setSubActionLoading = (subId: string, isLoading: boolean) => {
    setSubActionLoadingState((prev) => ({ ...prev, [subId]: isLoading }));
  };
  const [couponCode] = useState(copCode || "");
  const [couponStatus, setCouponStatus] = useState<"valid" | "invalid" | null>(
    null
  );
  const checkCouponValidity = () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }
    setCouponStatus(null);
    try {
      if (couponCode === channel?.couponCode) {
        setCouponStatus("valid");
      } else {
        setCouponStatus("invalid");
      }
    } catch (err) {
      console.error("Error checking coupon:", err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const [isKycModalOpen, setIsKycModalOpen] = useState(false); // State for KYC modal
  const initiateRazorpayPayment = useCallback(
    (orderData: InitiateTransactionOrderResponse) => {
      const subId = "";
      if (!window.Razorpay) {
        toast.error("Payment gateway not loaded. Please refresh.", {
          id: "rzp-sdk-error",
        });
        setSubActionLoading(subId, false);
        return;
      }

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount, // Amount in smallest currency unit (e.g., paise)
        currency: orderData.currency,
        name: "Telegram-WA Automation", // Replace with your actual company name
        description: `Subscription for ${channel?.name}`,
        order_id: orderData.orderId,
        handler: () => {
          // Payment successful according to Razorpay UI
          toast.loading("Verifying payment...", { id: "payment-verify" });
          setSubActionLoading(subId, true); // Keep loading during verification

          try {
            toast.success("Payment successful! Please complete the KYC", {
              id: "payment-verify",
            });
            setTimeout(() => {
              router(ROUTES.USER_DASHBOARD, { replace: true });
            }, 2000);
          } catch (verifyError) {
            const message = getErrorMessage(verifyError);
            console.error("Payment Verification Failed:", message);
            toast.error(
              `Payment verification failed: ${message}. Please contact support if payment was deducted.`,
              { id: "payment-verify", duration: 7000 }
            );
            // Optionally fetch subscriptions even on verification error, backend might have updated via webhook
            // fetchSubscriptions();
          } finally {
            setSubActionLoading(subId, false);
          }
        },
        prefill: {
          // Optional: Prefill user details
          name: "", // Add user name if available
          email: "", // Add user email if available
          contact: user?.phone || "", // Use phone from context if available
        },
        notes: {
          action: "New Sub",
        },
        theme: {
          color: "#f59e0b", // Example: Blue theme color
        },
        modal: {
          ondismiss: () => {
            // Handle user closing the modal
            console.log("Razorpay checkout modal dismissed by user");
            toast.error("Payment cancelled.", { id: "payment-dismissed" });
            setSubActionLoading(subId, false); // Reset loading state
          },
        },
      };

      const rzp = new window.Razorpay(options);

      // Handle payment failure callback from Razorpay
      rzp.on(
        "payment.failed",
        (response: {
          error: {
            code: string;
            description: string;
            source: string;
            step: string;
            reason: string;
            metadata: { order_id: string; payment_id: string };
          };
        }) => {
          console.error("Razorpay Payment Failed:", response.error);
          toast.error(
            `Payment Failed: ${response.error.description || response.error.reason
            }`,
            { id: "payment-failed", duration: 7000 }
          );
          setSubActionLoading(subId, false);
          // Refresh list in case status changed via webhook anyway
          // fetchSubscriptions();
        }
      );

      // Open the Razorpay checkout modal
      rzp.open();
    },
    [user]
  ); // Dependencies for the callback
  const handleSub = async (plan: Plan) => {
    const planID = plan._id;
    setSubActionLoading(planID, true);

    toast.loading("Initiating renewal...", { id: `new-${planID}` });

    try {
      // 1. Call backend upgrade endpoint with new plan ID
      toast.loading("Creating payment order...", { id: `new-${planID}` });
      const orderDetails = await initiateSubscribe({
        plan_id: planID,
        couponCode: couponStatus === "valid" ? couponCode : undefined,
      });

      // 1. Call backend to signal renewal intention (optional, depends on backend logic)
      // This endpoint might return plan/channel IDs needed for order creation

      toast.dismiss(`new-${planID}`);

      // 3. Initiate Razorpay checkout
      initiateRazorpayPayment(orderDetails);
      // Loading state is now managed by Razorpay callbacks
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`New Sub failed for plan ${planID}:`, message);
      toast.error(`New Sub failed: ${message}`, { id: `new-${planID}` });
      setSubActionLoading(planID, false);
    }
    // No finally block here, loading is handled by Razorpay flow
  };
  // Memoized function to fetch channel and plans
  const fetchChannelAndPlans = useCallback(async () => {
    if (!referralCode) {
      setError("Invalid channel link.");
      setIsLoading(false);
      return;
    }
    console.log(`Fetching public channel details for code: ${referralCode}`);
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicChannelByReferralCode(referralCode);
      setChannel(data);

    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`Failed to fetch public channel ${referralCode}:`, message);
      setError(message);
      toast.error(`Could not load channel: ${message}`, {
        id: `fetch-public-channel-${referralCode}-error`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [referralCode]); // Dependency: referralCode

  // Fetch data on component mount
  useEffect(() => {
    fetchChannelAndPlans();
    // Pre-load Razorpay script as payment might be initiated here
    loadRazorpayScript().then((loaded) => {
      if (!loaded) {
        toast.error("Failed to load payment gateway script.", {
          id: "razorpay-public-load-error",
        });
      }
    });
  }, [fetchChannelAndPlans]); // Run only once on mount

  useEffect(() => {
    if (copCode) {
      checkCouponValidity();
    }
  }, [channel]);

  // --- Subscribe Button Handler ---
  const handleSubscribeClick = (plan: Plan) => {
    console.log(
      `Subscribe clicked for plan ${plan.name} on channel ${channel?.name}`
    );

    if (!isAuthenticated) {
      console.log("User not authenticated, redirecting to login.");
      // Store the current URL before redirecting
      storeRedirectUrl(window.location.href);
      // Redirect to user login page
      router(ROUTES.LOGIN_USER);
      return; // Stop here
    }


    // This part is currently just a placeholder log message.
    console.log(
      `User authenticated and KYC submitted. Proceeding to payment for Plan ID: ${plan._id}, Channel ID: ${channel?._id}`
    );
    handleSub(plan);
  };

  // --- Render Logic ---
  const renderContent = () => {
    if (isLoading) {
      return <LoadingIndicator text="Loading channel and plans..." />;
    }

    if (error) {
      return (
        <div className="text-center">
          <ErrorMessage title="Error Loading Channel" message={error} />
          <Button onClick={fetchChannelAndPlans} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    if (!channel) {
      // Should be covered by error state, but as a safeguard
      return (
        <ErrorMessage title="Error" message="Channel data not available." />
      );
    }

    const activePlans =
      channel.associated_plan_ids?.filter((plan) => plan.is_active) || [];

    return (
      <div className="space-y-6">
        <div className="bg-dark-secondary p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-text-primary mb-3">
            {channel.name}
          </h2>
          <p className="text-sm text-text-secondary">
            {channel.description}
          </p>
          {/* Optional: Display Telegram Chat ID/Username if public */}
          {/* <p className="text-xs text-text-secondary mt-2">Telegram: {channel.telegram_chat_id}</p> */}
        </div>

        <div className="bg-dark-secondary p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Available Plans
          </h2>

          {activePlans.length === 0 ? (
            <p className="text-center text-text-secondary italic">
              No active plans available for this channel currently.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {activePlans.map((plan) => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  couponStatus={couponStatus}
                  handleSubscribeClick={handleSubscribeClick}
                  discountpercent={channel.couponDiscount}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex justify-center items-start bg-dark-primary p-6">
      <div className=" rounded-xl shadow-xl w-full max-w-xl">
        <main className="flex-grow container mx-auto py-6 md:py-8">
          <PageTitle
            title="View Channel & Plans"
            subtitle={
              channel?.name
                ? `Details for ${channel.name}`
                : "Loading channel details..."
            }
          />
          {renderContent()}
        </main>

        {/* Render the KYC Prompt Modal conditionally */}
        {user && ( // Only show if a user is logged in
          <KycPromptModal
            isOpen={isKycModalOpen}
            onClose={() => setIsKycModalOpen(false)}
            sub={null}
          />
        )}

        <FaqSection />
      </div>
    </div>
  );
}
