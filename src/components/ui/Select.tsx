// components/ui/Select.tsx
import React, { SelectHTMLAttributes, useState } from "react";
import LoadingIndicator from "./LoadingIndicator";

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string | null;
  containerClassName?: string;
  placeholder?: string;
  value: string | number | null | undefined;
  isLoading?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  id,
  name,
  options,
  error,
  className = "",
  containerClassName = "",
  placeholder,
  value,
  isLoading = false,
  disabled,
  onFocus,
  onBlur,
  ...props
}) => {
  const selectId = id || name;
  const hasError = !!error;
  const isDisabled = disabled || isLoading;
  const [isFocused, setIsFocused] = useState(false); // Track focus state

  // Determine if label should be floated: Focused OR has a value other than the initial placeholder value
  const hasSelectedValue = value != null && value !== ""; // Value is not null/undefined and not empty string
  const isFloated = isFocused || hasSelectedValue;

  // Base styles for the select element container
  const baseContainerStyle = "mb-4 relative";

  // Conditional styles for border based on error state + hover/focus
  const borderStyle = hasError
    ? "border-functional-danger focus:ring-functional-danger focus:border-functional-danger"
    : "border-dark-border hover:border-golden-subtle focus:ring-golden-focus-ring focus:border-golden-accent";

  // Combine container classes
  const combinedContainerClassName = `${baseContainerStyle} ${containerClassName}`;

  // Styles for the floating label
  const baseLabelStyle = `absolute left-3 text-text-secondary text-sm font-medium transition-all duration-150 ease-in-out pointer-events-none z-10`;

  // Styles for the label when select is focused OR has selected value (isFloated is true)
  const floatedLabelStyle = `
     top-2
     text-xs
     -translate-y-0
     ${hasError ? "text-functional-danger" : "text-golden-accent"}
   `;

  // Styles for the label when select is NOT focused and HAS NO selected value
  const initialLabelStyle = `
     top-2
     text-xs
     -translate-y-0
   `;

  // Error color for the label when not floated
  const initialErrorLabelStyle =
    hasError && !isFloated ? "text-functional-danger" : "";

  // Handlers to update focus state and call original handlers
  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className={combinedContainerClassName}>
      {/* Render label if provided - positioned absolutely */}
      {label && (
        <label
          htmlFor={selectId}
          // Apply conditional styles based on isFloated state
          className={`${baseLabelStyle} ${isFloated ? floatedLabelStyle : initialLabelStyle
            } ${initialErrorLabelStyle}`}
        >
          {label}
          {props.required && !isFloated && (
            <span className="text-functional-danger ml-1">*</span>
          )}{" "}
          {/* Show required on initial position */}
        </label>
      )}
      {/* Select Wrapper for Border/Arrow/Loader */}
      <div className={`relative rounded ${borderStyle}`}>
        {/* Added pt-6 for space for the floating label */}
        <select
          id={selectId}
          name={name}
          className={`peer w-full pl-3 pr-10 pt-6 pb-2 bg-dark-tertiary text-text-primary rounded appearance-none transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed border-transparent focus:border-transparent focus:ring-0 ${className}`}
          value={value ?? ""}
          disabled={isDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? `${selectId}-error` : undefined}
          {...props}
        >
          {/* Placeholder Option */}
          {placeholder && (
            // Placeholder option - value is empty string
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {/* Render actual options */}
          {options.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom Arrow Indicator or Loading Spinner */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
          {isLoading ? (
            <LoadingIndicator size="sm" textColor="text-text-secondary" />
          ) : (
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          )}
        </div>
      </div>{" "}
      {/* End of relative wrapper */}
      {hasError && (
        <p
          id={`${selectId}-error`}
          className="mt-1 text-xs text-functional-danger"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
