// components/ui/DateOfBirthInput.tsx
import React, { InputHTMLAttributes } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons"; // Icon for date input

interface DateOfBirthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  containerClassName?: string;
  // Note: labelClassName is not needed as label styling is internal
  // Note: placeholder is not typically used with type="date" and is styled transparently anyway
}

const DateOfBirthInput: React.FC<DateOfBirthInputProps> = ({
  label = "Date of Birth", // Default label
  id,
  name,
  error,
  className = "",
  containerClassName = "",
  value, // Value for the date input (expects YYYY-MM-DD format)
  disabled,
  ...props // Capture other standard input props (like required, onChange, onBlur etc.)
}) => {
  const inputId = id || name;
  const hasError = !!error;
  const isDisabled = disabled; // Use the standard disabled prop

  // Base styles for the container (relative for label positioning)
  const baseContainerStyle = "mb-4 relative";

  // Base styles for the input element (type="date")
  // Adjusted padding to make space for the *always* floated label
  // Removed default appearance to style manually if needed, but date inputs are tricky
  const baseInputStyle =
    "w-full px-3 pt-6 pb-2 bg-dark-tertiary border rounded focus:outline-none focus:ring-2 text-text-primary placeholder-transparent transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed appearance-none";

  // Conditional styles for border based on error state + hover/focus
  // Added hover:border-golden-subtle when no error
  const borderStyle = hasError
    ? "border-functional-danger focus:ring-functional-danger focus:border-functional-danger"
    : "border-dark-border hover:border-golden-subtle focus:ring-golden-focus-ring focus:border-golden-accent";

  // Combine base, border, and custom input classes
  const combinedInputClassName = `${baseInputStyle} ${borderStyle} ${className}`;

  // Base styles for the always-floating label
  // Positioned at the top-left corner (adjust top/left as needed for padding)
  const floatingLabelStyle = `
    absolute left-3 top-2
    text-xs
    -translate-y-0
    text-text-secondary font-medium
    transition-all duration-150 ease-in-out
    pointer-events-none z-10
    ${hasError ? "text-functional-danger" : ""} /* Label color reflects error */
  `;

  return (
    <div className={`${baseContainerStyle} ${containerClassName}`}>
      {/* Render label if provided - positioned absolutely */}
      {label && (
        <label
          htmlFor={inputId}
          // Apply the always-floating styles
          className={floatingLabelStyle}
        >
          {label}
          {props.required && (
            <span className="text-functional-danger ml-1">*</span>
          )}{" "}
          {/* Required indicator stays with label */}
        </label>
      )}

      {/* Input Element (type="date") */}
      <input
        id={inputId}
        name={name}
        type="date" // Use date type for date picker functionality
        className={`${combinedInputClassName} ${
          isDisabled ? "date-input-disabled" : ""
        }`} // Add class for disabled date picker icon styling
        value={value} // Controlled component value (YYYY-MM-DD)
        disabled={isDisabled} // Use the disabled prop
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        {...props} // Spread the rest of the input props (onChange, onBlur etc.)
      />

      {/* Render error message if error exists */}
      {hasError && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-xs text-functional-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {/* Optional: Add a calendar icon manually if default is hidden/not styled */}
      {/* <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary">
           {!isDisabled && <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5" />}
       </div> */}
    </div>
  );
};

export default DateOfBirthInput;
