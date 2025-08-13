// components/ui/LoadingIndicator.tsx
import React from 'react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Added xl size
  text?: string; // Optional text to display alongside the spinner
  className?: string; // Allow passing additional classes for positioning/styling
  textColor?: string; // Optional override for spinner color (defaults to accent-blue)
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  text,
  className = '',
  textColor = 'text-golden-accent', // Default color
}) => {
  // Tailwind size classes for width, height, and border thickness
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-[3px]',
    lg: 'w-8 h-8 border-4',
    xl: 'w-12 h-12 border-4',
  };

  return (
    // Flex container to align spinner and text
    <div className={`flex items-center justify-center ${className}`}>
      {/* The Spinner */}
      <div
        className={`animate-spin rounded-full border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${textColor}`}
        role="status" // ARIA role for accessibility
      >
        {/* Screen reader only text */}
        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
          Loading...
        </span>
      </div>
       {/* Optional Text */}
       {text && <span className="ml-3 text-sm text-text-secondary">{text}</span>}
    </div>
  );
};

export default LoadingIndicator;
