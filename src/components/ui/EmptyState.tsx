// components/ui/EmptyState.tsx
import React, { ReactNode } from 'react';

interface EmptyStateProps {
  message: string; // The primary message explaining the empty state
  icon?: ReactNode;
  children?: ReactNode; // Optional content, typically action buttons or links
  className?: string; // Allow custom styling for the container
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  children, // Action elements
  className = '', // Default empty class
}) => {
  // Base styles for the empty state container
  const baseStyle = 'text-center p-6 md:p-8 border border-dashed border-dark-tertiary rounded-lg bg-dark-secondary bg-opacity-50';
  // Combine base and custom classes
  const combinedClassName = `${baseStyle} ${className}`;

  return (
    <div className={combinedClassName}>
      {/* Render Icon if provided */}
      {icon && (
        <div className="mb-4 text-gray-500 text-4xl md:text-5xl mx-auto w-fit opacity-70">
          {icon}
        </div>
      )}
      {/* Empty State Message */}
      <p className="text-base md:text-lg text-text-secondary mb-4">{message}</p>
      {/* Optional Action Buttons/Links */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default EmptyState;
