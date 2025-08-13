// components/admin/ChannelListItem.tsx

import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { Channel, PopulatedChannel } from "../../types";
import { FRONTEND_BASE_URL, ROUTES } from "../../lib/constants";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Import icons for navigation buttons if you want them inside the buttons
import {
  faEye,
  faList,
  faUsers,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";

interface ChannelListItemProps {
  channel: PopulatedChannel | Channel;
}

const ChannelListItem: React.FC<ChannelListItemProps> = ({ channel }) => {
  const isActive = channel.is_active ?? false;

  const [isCopying, setIsCopying] = useState(false);

  // Construct the public URL for the channel
  const publicChannelUrl = channel.referralCode
    ? `${FRONTEND_BASE_URL}${ROUTES.PUBLIC_CHANNEL_PLANS(channel.referralCode)}`
    : null;

  // Construct the public URL with coupon code - ensure correct query param syntax
  const publicDiscountedChannelUrl =
    channel.couponCode && channel.referralCode
      ? `${FRONTEND_BASE_URL}${ROUTES.PUBLIC_CHANNEL_PLANS(
          channel.referralCode
        )}?couponCode=${channel.couponCode}`
      : null;

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Fallback copy failed:", err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const handleCopyLink = useCallback(async (link: string | null) => {
    if (!link) {
      toast.error("Channel link not available.");
      return;
    }

    setIsCopying(true);
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(link);
      } else {
        fallbackCopy(link);
      }
      toast.success("Channel link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast.error("Failed to copy link. Please try again.");
    } finally {
      setTimeout(() => setIsCopying(false), 500);
    }
  }, []);

  return (
    // List item container with enhanced styling and hover animation
    <div className="bg-dark-primary p-4 rounded-lg shadow hover:shadow-md transition-all duration-200 ease-in-out border border-dark-tertiary hover:border-golden-accent flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
      {/* Channel Information Section */}
      <div className="flex-grow mr-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="text-lg font-semibold text-text-primary truncate"
            title={channel.name}
          >
            {channel.name}
          </h3>
          {/* Display Active/Inactive Badge */}
          <Badge status={isActive ? "active" : "inactive"} size="sm" />
          {/* Optional: Display referral code if present */}
          {channel.referralCode && (
            <span className="text-xs text-text-secondary font-mono bg-dark-tertiary px-2 py-0.5 rounded-full">
              {channel.referralCode}
            </span>
          )}
        </div>
        {/* Details with refined vertical spacing */}
        <p
          className="text-sm text-text-secondary mt-0.5 truncate" // Use mt-0.5 for tighter spacing
          title={channel.telegram_chat_id}
        >
          <span className="font-medium">ID:</span> {channel.telegram_chat_id}
        </p>
        {/* Optional: Display description or other info */}
        {channel.description && (
          <p
            className="text-xs text-text-secondary mt-0.5 truncate"
            title={channel.description}
          >
            {channel.description}
          </p>
        )}
        {/* Optional: Display plan count */}
        {Array.isArray(channel.associated_plan_ids) && (
          <p className="text-xs text-text-secondary mt-0.5">
            {channel.associated_plan_ids.length} Plan(s) Associated
          </p>
        )}
      </div>

      {/* Action Buttons Section - Uses flex-wrap */}
      <div className="flex flex-shrink-0 flex-wrap gap-2 justify-end">
        {isActive && publicChannelUrl && (
          <Button
            onClick={() => handleCopyLink(publicChannelUrl)}
            variant="secondary"
            size="sm"
            isLoading={isCopying} // Show loading state
            disabled={isCopying} // Disable while copying
            title="Copy Public Channel Link"
          >
            <span className="flex items-center gap-1">
              Public
              <FontAwesomeIcon icon={faCopy} />
            </span>
          </Button>
        )}
        {isActive && publicDiscountedChannelUrl && (
          <Button
            onClick={() => handleCopyLink(publicDiscountedChannelUrl)}
            variant="secondary"
            size="sm"
            isLoading={isCopying}
            disabled={isCopying}
            title="Copy Coupon Public Channel Link"
          >
            <span className="flex items-center gap-1">
              Coupon
              <FontAwesomeIcon icon={faCopy} />
            </span>
          </Button>
        )}
        {/* Navigation Buttons - Wrapped correctly in Link */}
        <Link to={ROUTES.ADMIN_CHANNEL_OVERVIEW(channel._id)}>
          <Button variant="secondary" size="sm" title="View Channel Overview">
            <FontAwesomeIcon icon={faEye} className="mr-1" />
            Overview
          </Button>
        </Link>
        {/* Plans Button */}
        <Link to={ROUTES.ADMIN_CHANNEL_PLANS(channel._id)}>
          <Button variant="secondary" size="sm" title="Manage Associated Plans">
            <FontAwesomeIcon icon={faList} className="mr-1" />
            Plans
          </Button>
        </Link>
        {/* Subscriptions Button */}
        <Link to={ROUTES.ADMIN_CHANNEL_SUBS(channel._id)}>
          <Button
            variant="secondary"
            size="sm"
            title="View Channel Subscriptions"
          >
            <FontAwesomeIcon icon={faUsers} className="mr-1" />
            Subs
          </Button>
        </Link>
        {/* Edit Button - Highlighted as 'info' */}
        <Link to={ROUTES.ADMIN_CHANNEL_EDIT(channel._id)}>
          <Button variant="info" size="sm" title="Edit Channel Settings">
            <FontAwesomeIcon icon={faEdit} className="mr-1" />
            Edit
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ChannelListItem;
