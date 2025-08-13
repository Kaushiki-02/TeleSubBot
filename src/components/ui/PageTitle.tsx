// components/ui/PageTitle.tsx
import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string; // Optional subtitle text
  className?: string; // Allow passing custom classes for the container div
}

const PageTitle: React.FC<PageTitleProps> = ({
    title,
    subtitle,
    className = ''
}) => {
  return (
    // Container div allows applying margins/padding via className
    <div className={`mb-4 md:mb-6 ${className}`}>
      {/* Main Title */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
          {title}
      </h1>
      {/* Subtitle (rendered only if provided) */}
      {subtitle && (
        <p className="mt-1 text-sm sm:text-base text-text-secondary">
            {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageTitle;
