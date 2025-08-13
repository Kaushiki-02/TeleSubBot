// components/ui/RoleBadge.tsx
import React from "react";
// No external constants needed for role names unless preferred
// import { ROLES } from '../lib/constants'; // Optional if you have role constants

// Define possible role names explicitly, allow string as fallback
type RoleName = "SuperAdmin" | "Admin" | "Sales" | "Support" | "User" | string;

interface RoleBadgeProps {
  // Use the specific type for role prop
  role: RoleName;
  size?: "sm" | "md";
  className?: string; // Allow custom classes
}

const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = "md",
  className = "",
}) => {
  // Normalize the role name for style lookup key (lowercase)
  const lowerCaseRole = String(role).toLowerCase();

  // Define styles based on role names
  // Using a simple map for clarity, could use constants if available
  const roleStyles: Record<string, string> = {
    // Using semantic-like colors from globals.css or other distinct colors
    superadmin:
      "bg-golden-accent/20 text-golden-accent border border-golden-accent/50 font-bold", // Distinctive for SuperAdmin
    admin:
      "bg-functional-info/20 text-functional-info border border-functional-info/50", // Blueish for Admin
    sales:
      "bg-functional-success/20 text-functional-success border border-functional-success/50", // Greenish for Sales
    support:
      "bg-dark-tertiary/50 text-text-secondary border border-dark-border", // Greyish for Support
    user: "bg-dark-tertiary/50 text-text-secondary border border-dark-border", // Greyish for standard User (can be same as support)
    // Default fallback style for unknown roles
    default:
      "bg-dark-tertiary/50 text-text-secondary border border-dark-border",
  };

  // Define size styles (can reuse from Badge component logic or replicate)
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] leading-none", // Use smaller text and padding for sm
    md: "px-2.5 py-1 text-xs", // Standard size
  };

  // Determine the style to apply based on role, fallback to default
  const style = roleStyles[lowerCaseRole] || roleStyles.default;

  // Combine base, size, role-specific, and custom classes
  const combinedClassName = `inline-block rounded-full font-medium capitalize whitespace-nowrap ${sizeStyles[size]} ${style} ${className}`;

  return (
    <span className={combinedClassName}>
      {/* Display the original role text (will be capitalized by CSS) */}
      {role}
    </span>
  );
};

export default RoleBadge;
