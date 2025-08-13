import React from "react";
import { SUBSCRIPTION_STATUS } from "../../lib/constants";

type BadgeStatus =
  | (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]
  | "active"
  | "inactive"
  | "pending"
  | "expired"
  | "revoked"
  | string;

interface BadgeProps {
  status: BadgeStatus;
  size?: "sm" | "md";
  className?: string;
  children?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  status,
  size = "md",
  className = "",
  children,
}) => {
  const lowerCaseStatus = String(status).toLowerCase();

  const statusStyles: Record<string, string> = {
    [SUBSCRIPTION_STATUS.ACTIVE]:
      "bg-status-active/20 text-status-active border border-status-active/50",
    [SUBSCRIPTION_STATUS.EXPIRED]:
      "bg-status-expired/20 text-status-expired border border-status-expired/50",
    [SUBSCRIPTION_STATUS.REVOKED]:
      "bg-status-revoked/20 text-status-revoked border border-status-revoked/50",
    [SUBSCRIPTION_STATUS.PENDING]:
      "bg-status-pending/20 text-status-pending border border-status-pending/50",
    active:
      "bg-status-active/20 text-status-active border border-status-active/50",
    inactive:
      "bg-status-inactive/20 text-status-inactive border border-status-inactive/50",
    default:
      "bg-dark-tertiary/50 text-text-secondary border border-dark-border",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] leading-none",
    md: "px-2.5 py-1 text-xs",
  };

  const style = statusStyles[lowerCaseStatus] || statusStyles.default;

  const combinedClassName = `inline-block rounded-full font-medium capitalize whitespace-nowrap ${sizeStyles[size]} ${style} ${className}`;

  return <span className={combinedClassName}>{children ?? status}</span>;
};

export default Badge;
