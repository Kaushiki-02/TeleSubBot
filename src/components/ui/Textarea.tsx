// components/ui/Textarea.tsx
import React, { TextareaHTMLAttributes, useState } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  containerClassName?: string;
}

const TextArea: React.FC<TextareaProps> = ({
  label,
  id,
  name,
  error,
  className = "",
  containerClassName = "",
  rows = 3,
  placeholder = " ",
  value,
  onFocus,
  onBlur,
  ...props
}) => {
  const textareaId = id || name;
  const hasError = !!error;
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value != null && value !== "";
  const isFloated = isFocused || hasValue;

  // Base styles for the textarea element
  const baseStyle =
    "w-full px-3 pt-6 pb-2 bg-dark-tertiary border rounded focus:outline-none focus:ring-2 text-text-primary placeholder-transparent transition duration-150 ease-in-out resize-y disabled:opacity-50 disabled:cursor-not-allowed";

  // Conditional styles based on error state
  const borderStyle = hasError
    ? "border-functional-danger focus:ring-functional-danger focus:border-functional-danger" // Error state
    : "border-dark-border hover:border-golden-subtle focus:ring-golden-focus-ring focus:border-golden-accent"; // Default state

  // Combine base, border, and custom textarea classes
  const combinedTextareaClassName = `peer ${baseStyle} ${borderStyle} ${className}`;

  // Combine base and custom container classes
  const combinedContainerClassName = `mb-4 relative ${containerClassName}`;

  // Base styles for the floating label
  const baseLabelStyle = `absolute left-3 text-text-secondary text-sm font-medium transition-all duration-150 ease-in-out pointer-events-none z-10`;

  // Styles for the label when textarea is focused OR has value (isFloated is true)
  const floatedLabelStyle = `
     top-2
     text-xs
     -translate-y-0
     ${
       hasError ? "text-functional-danger" : "text-golden-accent"
     } /* Label color reflects error or accent */
   `;

  // Styles for the label when textarea is NOT focused and HAS NO value
  const initialLabelStyle = `
     top-5
     text-sm
     -translate-y-1/2
   `;

  // Error color for the label when not floated
  const initialErrorLabelStyle =
    hasError && !isFloated ? "text-functional-danger" : "";

  // Handlers to update focus state and call original handlers
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className={combinedContainerClassName}>
      {/* Textarea Element - must be *before* the label for peer-placeholder-shown to work */}
      <textarea
        id={textareaId}
        name={name}
        className={combinedTextareaClassName}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? `${textareaId}-error` : undefined}
        {...props}
      />
      {/* Render label if provided - positioned absolutely */}
      {label && (
        <label
          htmlFor={textareaId}
          // Apply conditional styles based on isFloated state
          className={`${baseLabelStyle} ${
            isFloated ? floatedLabelStyle : initialLabelStyle
          } ${initialErrorLabelStyle}`}
        >
          {label}
          {props.required && !isFloated && (
            <span className="text-functional-danger ml-1">*</span>
          )}
          {/* Show required on initial position */}
        </label>
      )}

      {/* Render error message if error exists */}
      {hasError && (
        <p
          id={`${textareaId}-error`}
          className="mt-1 text-xs text-functional-danger"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default TextArea;
