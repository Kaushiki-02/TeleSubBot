// components/user/SubscriptionCard.tsx
import React, { useCallback, useState } from "react";
import { UserSubscription } from "../../types";
import { formatDate, getDaysRemaining } from "../../lib/utils";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingIndicator from "../../components/ui/LoadingIndicator";
import { SUBSCRIPTION_STATUS } from "../../lib/constants";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faArrowUp,
  faFileInvoiceDollar,
} from "@fortawesome/free-solid-svg-icons";

interface SubscriptionCardProps {
  subscription: UserSubscription;
  onRenew: () => void;
  onKYC: () => void;
  onUpgrade: () => void;
  onViewInvoice: () => void;
  isLoading?: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onRenew,
  onKYC,
  onUpgrade,
  onViewInvoice,
  isLoading = false,
}) => {
  const [, setIsCopying] = useState(false);

  const fallbackCopy = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  };

  const handleCopyLink = useCallback(async () => {
    setIsCopying(true);
    try {
      const slug =
        typeof subscription.link_id === "object"
          ? subscription.link_id.url_slug
          : null;
      if (slug) {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(slug);
        } else {
          fallbackCopy(slug);
        }
        toast.success("Channel link copied to clipboard!");
      } else {
        toast.error("Channel link not available.");
      }
    } catch {
      toast.error("Copy failed");
    } finally {
      setIsCopying(false);
    }
  }, [subscription.link_id]);

  const { status, start_date, end_date, last_transaction_id } = subscription;
  const plan = typeof subscription.plan_id === "object" && subscription.plan_id;
  const channel =
    typeof subscription.channel_id === "object" && subscription.channel_id;
  const daysRemaining = getDaysRemaining(end_date);

  const canRenew = status === SUBSCRIPTION_STATUS.EXPIRED;
  const canKYC = status === SUBSCRIPTION_STATUS.GETKYC;
  const canLink = status === SUBSCRIPTION_STATUS.PENDING;
  const canUpgrade = status === SUBSCRIPTION_STATUS.ACTIVE;
  const canViewInvoice =
    !!last_transaction_id &&
    [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.EXPIRED].includes(status);

  return (
    <div
      className="
        relative
        bg-dark-secondary
        border border-dark-tertiary
        rounded-lg
        shadow-lg
        p-6
        flex flex-col
        transition
        hover:shadow-xl
        hover:-translate-y-1
        hover:border-golden-accent
        duration-200
      "
    >
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg z-10">
          <LoadingIndicator size="md" textColor="text-text-primary" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-xl font-semibold text-text-primary truncate leading-tight"
          title={channel?.name || ""}
        >
          {channel?.name || "Unknown Channel"}
        </h3>
        <Badge status={status} size="sm" />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 mb-6 text-sm">
        {[
          ["Plan", plan?.name],
          [
            "Price",
            plan ? `₹${plan.discounted_price ?? plan.markup_price}` : "N/A",
          ],
          [
            "Validity",
            plan?.validity_days
              ? `${plan.validity_days} day${plan.validity_days !== 1 ? "s" : ""
              }`
              : "N/A",
          ],
          ["Started", formatDate(start_date)],
          ["Expires", formatDate(end_date)],
        ].map(([label, val]) => (
          <div key={label} className="flex">
            <span className="w-24 font-medium text-text-secondary">
              {label}:
            </span>
            <span className="text-text-primary">{val ?? "N/A"}</span>
          </div>
        ))}

        {(status === SUBSCRIPTION_STATUS.ACTIVE ||
          status === SUBSCRIPTION_STATUS.EXPIRED) && (
            <div className="sm:col-span-2 mt-3">
              <span
                className={`
                block
                font-medium
                ${status === SUBSCRIPTION_STATUS.ACTIVE
                    ? daysRemaining! > 3
                      ? "text-functional-success"
                      : "text-functional-warning"
                    : "text-status-expired"
                  }
              `}
              >
                {status === SUBSCRIPTION_STATUS.ACTIVE
                  ? daysRemaining! > 0
                    ? `Expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""
                    }`
                    : "Expires today"
                  : `Expired on ${formatDate(end_date)}`}
              </span>
            </div>
          )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-wrap gap-3 justify-end pt-4 border-t border-dark-tertiary">
        {canRenew && (
          <Button onClick={onRenew} size="sm" variant="success">
            Renew
          </Button>
        )}
        {canKYC && (
          <Button onClick={onKYC} size="sm" variant="primary">
            Submit KYC
          </Button>
        )}
        {canLink && (
          <Button onClick={handleCopyLink} size="sm" variant="secondary">
            <FontAwesomeIcon icon={faCopy} className="mr-1" />
            Copy Link
          </Button>
        )}
        {canUpgrade && (
          <Button onClick={onUpgrade} size="sm" variant="info">
            <FontAwesomeIcon icon={faArrowUp} className="mr-1" />
            Extend Plan
          </Button>
        )}
        {canViewInvoice && (
          <Button onClick={onViewInvoice} size="sm" variant="secondary">
            <FontAwesomeIcon icon={faFileInvoiceDollar} className="mr-1" />
            Invoice
          </Button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionCard;
