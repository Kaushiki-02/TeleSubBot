// components/ui/ErrorMessage.tsx
import React from 'react';

interface ErrorMessageProps {
  message: string | null; // Error message string or null to render nothing
  title?: string; // Optional title for the error box
  className?: string; // Allow custom styling/positioning
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
    message,
    title,
    className = '' // Default empty string
}) => {
  // Don't render anything if there's no message
  if (!message) {
    return null;
  }

  // Base styles for the error container
  const baseStyle = 'p-3 border rounded text-sm';
  // Specific error styles (background, border, text color)
  const errorStyle = 'bg-functional-danger/20 border-functional-danger text-functional-danger'; // Use lighter red text for better contrast on dark bg

  // Combine base, error specific, and custom classes
  const combinedClassName = `${baseStyle} ${errorStyle} ${className}`;

  return (
    <div
      className={combinedClassName}
      role="alert" // ARIA role for error messages
    >
      {/* Optional Title */}
      {title && <strong className="font-semibold block mb-1">{title}</strong>}
      {/* The Error Message */}
      {message}
    </div>
  );
};

export default ErrorMessage;
