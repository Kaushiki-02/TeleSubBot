// app/(user)/my-groups/page.tsx
import { useState, useEffect, useCallback } from "react";

import toast from "react-hot-toast";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import SubscriptionCard from "../../../components/user/SubscriptionCard";
import EmptyState from "../../../components/ui/EmptyState";
import UpgradeModal from "../../../components/user/UpgradeModal";
import RenewModal from "../../../components/user/renewModel";
import Button from "../../../components/ui/Button";
import KycPromptModal from "../../../components/user/KycPromptModal";
import {
  getUserSubscriptions,
  initiateUpgrade,
  getChannelDetails,
  getTransactionInvoice,
} from "../../../lib/apiClient";
import {
  UserSubscription,
  Plan,
  InitiateTransactionOrderResponse,
  SubscriptionUpgradePayload,
} from "../../../types";
import { getErrorMessage, loadRazorpayScript } from "../../../lib/utils";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../lib/constants";
import { getRedirectUrl, removeRedirectUrl } from "../../../lib/auth";
declare global {
  interface Window {
    Razorpay: any;
  }
}
export default function MySubscriptionsPage() {
  const router = useNavigate();
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedSubscriptionForUpgrade, setSelectedSubscriptionForUpgrade] =
    useState<UserSubscription | null>(null);
  const [upgradeOptions, setUpgradeOptions] = useState<Plan[]>([]);
  const [isUpgradeOptionsLoading, setIsUpgradeOptionsLoading] = useState(false);
  const [upgradeModalError, setUpgradeModalError] = useState<string | null>(
    null
  );
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedSubscriptionForRenew, setSelectedSubscriptionForRenew] =
    useState<UserSubscription | null>(null);
  const [isRenewOptionsLoading, setIsRenewOptionsLoading] = useState(false);
  const [RenewModalError, setRenewModalError] = useState<string | null>(null);
  const [renewOptions, setrenewOptions] = useState<Plan[]>([]);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [selectedSubscriptionForKYC, setSelectedSubscriptionForKYC] =
    useState<UserSubscription | null>(null);
  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserSubscriptions();
      const processedData = data.map((sub) => ({
        ...sub,
        plan: typeof sub.plan_id === "object" ? sub.plan_id : undefined,
        channel:
          typeof sub.channel_id === "object" ? sub.channel_id : undefined,
      }));


      const renewedIds =
        processedData
          .map(sub => sub.from_subscription_id)
          .filter(id => id) // filter out nulls
      const renewedIdSet = new Set(renewedIds);
      const filteredData = processedData.filter(
        (sub) => !renewedIdSet.has(sub._id)
      );

      setSubscriptions(filteredData);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(`Error loading subscriptions: ${message}`, {
        id: "fetch-subs-error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchSubscriptions();
    loadRazorpayScript().then((loaded) => {
      if (!loaded) {
        toast.error("Failed to load payment gateway. Please refresh.", {
          id: "razorpay-load-error",
        });
      }
    });
  }, [fetchSubscriptions]);
  const setSubActionLoading = (subId: string, loading: boolean) => {
    setActionLoading((prev) => ({ ...prev, [subId]: loading }));
  };
  const initiateRazorpayPayment = useCallback(
    (
      orderData: InitiateTransactionOrderResponse,
      subId: string,
      actionType: "renew" | "upgrade"
    ) => {
      if (!window.Razorpay) {
        toast.error("Payment gateway not loaded. Please refresh.", {
          id: "rzp-sdk-error",
        });
        setSubActionLoading(subId, false);
        return;
      }
      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Telegram-WA Automation",
        description: `${actionType === "renew"
          ? "Subscription Renewal"
          : "Subscription Extend"
          } for ${selectedSubscriptionForUpgrade?.channel?.name || subId}`,
        order_id: orderData.orderId,
        handler: async () => {
          toast.loading("Verifying payment...", { id: "payment-verify" });
          setSubActionLoading(subId, true);
          try {
            toast.success("Payment successful! Subscription updated.", {
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
          } finally {
            setSubActionLoading(subId, false);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: user?.phone || "",
        },
        notes: {
          action: actionType,
        },
        theme: {
          color: "#ffbc06",
        },
        modal: {
          ondismiss: () => {
            console.log("Razorpay checkout modal dismissed by user");
            toast.error("Payment cancelled.", { id: "payment-dismissed" });
            setSubActionLoading(subId, false);
          },
        },
      };
      const rzp = new window.Razorpay(options);
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
        }
      );
      rzp.open();
    },
    [user, selectedSubscriptionForUpgrade]
  );
  const handleConfirmRenew = async (selectedNewPlanId: string) => {
    if (!user?.isKycSubmitted) {
      setIsKycModalOpen(true);
      return;
    }
    if (!selectedSubscriptionForRenew) return;
    const subId = selectedSubscriptionForRenew._id;
    setSubActionLoading(subId, true);
    toast.loading("Initiating renewal...", { id: `renew-${subId}` });
    try {
      toast.loading("Creating payment order...", { id: `renew-${subId}` });
      const orderDetails = await initiateUpgrade(subId, {
        new_plan_id: selectedNewPlanId,
        action: "renew",
      });
      toast.dismiss(`renew-${subId}`);
      initiateRazorpayPayment(orderDetails, subId, "renew");
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`Renewal failed for sub ${subId}:`, message);
      toast.error(`Renewal failed: ${message}`, { id: `renew-${subId}` });
      setSubActionLoading(subId, false);
    }
    finally {
      setIsRenewModalOpen(false)
    }
  };
  const handleOpenRenewModal = async (sub: UserSubscription) => {
    if (!user?.isKycSubmitted) {
      setIsKycModalOpen(true);
      return;
    }

    setSelectedSubscriptionForRenew(sub);
    setIsRenewModalOpen(true);
    setIsRenewOptionsLoading(true);
    setRenewModalError(null);
    setrenewOptions([]);
    const channelId =
      typeof sub.channel_id === "string" ? sub.channel_id : sub.channel?._id;
    const currentPlan =
      typeof sub.plan_id === "object" ? sub.plan_id : sub.plan;
    const currentPlanPrice =
      currentPlan?.discounted_price ?? currentPlan?.markup_price;
    if (!channelId || !currentPlan || currentPlanPrice === undefined) {
      setRenewModalError("Missing channel or plan details for Renew.");
      toast.error(
        "Cannot determine Renew options. Subscription details missing.",
        { id: "Renew-opt-error" }
      );
      setIsRenewOptionsLoading(false);
      return;
    }
    try {
      const channelData = await getChannelDetails(channelId);
      const availableUpgrades = (
        (channelData.associated_plan_ids as Plan[]) || []
      ).filter((p) => p.is_active);
      if (availableUpgrades.length === 0) {
        setRenewModalError("No plans available for Renew.");
      } else {
        setrenewOptions(availableUpgrades);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to fetch upgrade options:", message);
      setRenewModalError(`Failed to load Renew options: ${message}`);
      toast.error(`Failed to load Renew options: ${message}`, {
        id: "renew-opt-error",
      });
    } finally {
      setIsRenewOptionsLoading(false);
    }
  };
  const handleOpenUpgradeModal = async (sub: UserSubscription) => {
    if (!user?.isKycSubmitted) {
      setIsKycModalOpen(true);
      return;
    }
    setSelectedSubscriptionForUpgrade(sub);
    setIsUpgradeModalOpen(true);
    setIsUpgradeOptionsLoading(true);
    setUpgradeModalError(null);
    setUpgradeOptions([]);
    const channelId =
      typeof sub.channel_id === "string" ? sub.channel_id : sub.channel?._id;
    const currentPlan =
      typeof sub.plan_id === "object" ? sub.plan_id : sub.plan;
    const currentPlanPrice =
      currentPlan?.discounted_price ?? currentPlan?.markup_price;
    if (!channelId || !currentPlan || currentPlanPrice === undefined) {
      setUpgradeModalError("Missing channel or plan details for upgrade.");
      toast.error(
        "Cannot determine upgrade options. Subscription details missing.",
        { id: "upgrade-opt-error" }
      );
      setIsUpgradeOptionsLoading(false);
      return;
    }
    try {
      const channelData = await getChannelDetails(channelId);
      const availableUpgrades = (
        (channelData.associated_plan_ids as Plan[]) || []
      ).filter((p) => p.is_active);
      if (availableUpgrades.length === 0) {
        setUpgradeModalError("No plans available for upgrade.");
      } else {
        setUpgradeOptions(availableUpgrades);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to fetch upgrade options:", message);
      setUpgradeModalError(`Failed to load upgrade options: ${message}`);
      toast.error(`Failed to load upgrade options: ${message}`, {
        id: "upgrade-opt-error",
      });
    } finally {
      setIsUpgradeOptionsLoading(false);
    }
  };
  const handleConfirmUpgrade = async (selectedNewPlanId: string) => {
    if (!selectedSubscriptionForUpgrade) return;
    const subId = selectedSubscriptionForUpgrade._id;
    setSubActionLoading(subId, true);
    setUpgradeModalError(null);
    setIsUpgradeModalOpen(false);
    toast.loading("Initiating upgrade...", { id: `upgrade-${subId}` });
    try {
      const payload: SubscriptionUpgradePayload = {
        new_plan_id: selectedNewPlanId,
        action: "upgrade",
      };
      const orderDetails = await initiateUpgrade(subId, payload);
      toast.dismiss(`upgrade-${subId}`);
      initiateRazorpayPayment(orderDetails, subId, "upgrade");
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(`Upgrade failed for sub ${subId}:`, message);
      toast.error(`Upgrade failed: ${message}`, { id: `upgrade-${subId}` });
      setSubActionLoading(subId, false);
    }
  };
  const handleViewInvoice = async (sub: UserSubscription) => {
    const transactionId = sub.last_transaction_id;
    if (!transactionId) {
      toast.error("Invoice reference not found for this subscription.", {
        id: `invoice-${sub.id}`,
      });
      return;
    }
    setSubActionLoading(sub.id, true);
    toast.loading("Fetching invoice...", { id: `invoice-${sub.id}` });
    try {
      const response = await getTransactionInvoice(transactionId);
      if (response?.invoiceUrl) {
        window.open(response.invoiceUrl, "_blank", "noopener,noreferrer");
        toast.success("Invoice opened.", { id: `invoice-${sub.id}` });
      } else {
        throw new Error("Invoice URL not provided in response.");
      }
    } catch (err) {
      const message = getErrorMessage(err);
      console.error(
        `Failed to get invoice for transaction ${transactionId}:`,
        message
      );
      toast.error(`Could not retrieve invoice: ${message}`, {
        id: `invoice-${sub.id}`,
      });
    } finally {
      setSubActionLoading(sub.id, false);
      toast.dismiss(`invoice-${sub.id}`);
    }
  };
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-10">
          <LoadingIndicator text="Loading your subscriptions..." />
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center py-10">
          <ErrorMessage title="Error Loading Subscriptions" message={error} />
          <Button onClick={fetchSubscriptions} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }
    if (subscriptions.length === 0) {
      return (
        <EmptyState message="You currently have no active or past subscriptions." />
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {subscriptions.map((sub, index) => (
          <SubscriptionCard
            key={sub._id || index}
            subscription={sub}
            onRenew={() => handleOpenRenewModal(sub)}
            onKYC={() => {
              setSelectedSubscriptionForKYC(sub);
              setIsKycModalOpen(true);
            }}
            onUpgrade={() => handleOpenUpgradeModal(sub)}
            onViewInvoice={() => handleViewInvoice(sub)}
            isLoading={actionLoading[sub._id] || false}
          />
        ))}
      </div>
    );
  };
  useEffect(() => {
    const redUrl = getRedirectUrl()
    if (redUrl) {
      window.location.href = redUrl
      removeRedirectUrl()
    }
  }, [])

  return (
    <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 space-y-6 md:space-y-8">
      <PageTitle
        title="My Subscriptions"
        subtitle="View your current and past subscriptions."
      />
      {renderContent()}
      {selectedSubscriptionForUpgrade && (
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          currentSubscription={selectedSubscriptionForUpgrade}
          upgradeOptions={upgradeOptions}
          onConfirmUpgrade={handleConfirmUpgrade}
          isLoadingOptions={isUpgradeOptionsLoading}
          isLoadingConfirm={
            actionLoading[selectedSubscriptionForUpgrade._id] || false
          }
          error={upgradeModalError}
        />
      )}
      {selectedSubscriptionForRenew && (
        <RenewModal
          isOpen={isRenewModalOpen}
          onClose={() => setIsRenewModalOpen(false)}
          currentSubscription={selectedSubscriptionForRenew}
          onConfirmRenew={handleConfirmRenew}
          isLoadingConfirm={
            actionLoading[selectedSubscriptionForRenew._id] || false
          }
          error={RenewModalError}
          renewOptions={renewOptions}
          isLoadingOptions={isRenewOptionsLoading}
        />
      )}
      <KycPromptModal
        isOpen={isKycModalOpen}
        sub={selectedSubscriptionForKYC}
        onClose={() => setIsKycModalOpen(false)}
      />
    </div>
  );
}
