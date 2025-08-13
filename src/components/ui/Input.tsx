// components/ui/Input.tsx
import React, { InputHTMLAttributes, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  name,
  type = "text",
  error,
  className = "",
  containerClassName = "",
  placeholder = " ",
  value,
  onFocus,
  onBlur,
  labelClassName,
  inputClassName,
  ...props
}) => {
  const inputId = id || name;
  const hasError = !!error;
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value != null && value !== "";
  const isFloated = isFocused || hasValue;

  // Base styles for the input element
  const baseStyle =
    "w-full px-3 pt-6 pb-2 bg-dark-tertiary border rounded focus:outline-none focus:ring-2 text-text-primary placeholder-transparent transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed";

  // Conditional styles based on error state
  const borderStyle = hasError
    ? "border-functional-danger focus:ring-functional-danger focus:border-functional-danger"
    : "border-dark-border hover:border-golden-subtle focus:ring-golden-focus-ring focus:border-golden-accent";

  // Combine base, border, and custom input classes
  const combinedInputClassName = `peer ${baseStyle} ${borderStyle} ${className} ${inputClassName}`;

  // Combine base and custom container classes
  const combinedContainerClassName = `mb-4 relative ${containerClassName}`; // Added relative for positioning

  // Base styles for the floating label
  const baseLabelStyle = `absolute left-3 text-text-secondary text-sm font-medium transition-all duration-150 ease-in-out pointer-events-none z-10`;

  // Styles for the label when input is focused OR has value (isFloated is true)
  const floatedLabelStyle = `
     top-2
     text-xs
     -translate-y-0
     ${hasError ? "text-functional-danger" : "text-golden-accent"
    } /* Label color reflects error or accent */
   `;

  // Styles for the label when input is NOT focused and HAS NO value
  const initialLabelStyle = `
     top-1/2
     text-sm
     -translate-y-1/2
   `;

  // Error color for the label when not floated (e.g., if initial value had error) - less common scenario
  const initialErrorLabelStyle =
    hasError && !isFloated ? "text-functional-danger" : "";

  // Handlers to update focus state and call original handlers
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className={combinedContainerClassName}>
      {/* Input Element - must be *before* the label for peer-placeholder-shown to work (if still using it, though the JS logic is more robust now) */}
      <input
        id={inputId}
        name={name}
        type={type}
        className={combinedInputClassName}
        placeholder={placeholder}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        {...props}
      />

      {/* Render label if provided - positioned absolutely */}
      {label && (
        <label
          htmlFor={inputId}
          // Apply conditional styles based on isFloated state
          className={`${baseLabelStyle} ${isFloated ? floatedLabelStyle : initialLabelStyle
            } ${initialErrorLabelStyle} ${labelClassName}`}

        >
          {label}
          {props.required && !isFloated && (
            <span className="text-functional-danger ml-1">*</span>
          )}
        </label>
      )}

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
    </div>
  );
};

export default Input;
