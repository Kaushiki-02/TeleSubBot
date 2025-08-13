// components/ui/MultiSelect.tsx
import React, { useState, useRef } from "react";
import LoadingIndicator from "./LoadingIndicator";
import { useOutsideClick } from "../../lib/hooks";

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  label?: string;
  options: SelectOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string | null;
  containerClassName?: string;
  name?: string;
  id?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Select one or more...",
  isLoading = false,
  disabled = false,
  error,
  containerClassName = "",
  name,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const selectId =
    id || name || `multiselect-${Math.random().toString(36).substring(7)}`;
  const hasError = !!error;
  const isDisabled = disabled || isLoading;

  // Include buttonRef in exclusion list for outside click
  useOutsideClick(containerRef as React.RefObject<HTMLElement>, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  const handleSelect = (value: string) => {
    const isSelected = selectedValues.includes(value);
    let newSelectedValues: string[];

    if (isSelected) {
      newSelectedValues = selectedValues.filter((v) => v !== value);
    } else {
      newSelectedValues = [...selectedValues, value];
    }
    onChange(newSelectedValues);
  };

  const getSelectedLabels = (): string => {
    if (isLoading) return "Loading options...";
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const selectedOption = options.find(
        (opt) => String(opt.value) === selectedValues[0]
      );
      return selectedOption
        ? selectedOption.label
        : `${selectedValues.length} selected`;
    }
    return `${selectedValues.length} items selected`;
  };

  // --- Styling ---
  // Button padding adjusted for floating label space (pt-6)
  const baseButtonStyle =
    "w-full px-3 pt-6 pb-2 bg-dark-tertiary border rounded focus:outline-none text-text-primary placeholder-text-secondary cursor-pointer text-left flex justify-between items-center transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed";

  // Conditional styles for border based on error state + hover/open/focus
  const borderStyle = hasError
    ? "border-functional-danger" // Error border
    : isOpen
    ? "border-golden-accent" // Border when open
    : "border-dark-border hover:border-golden-subtle focus:border-golden-accent"; // Default, hover, focus border

  const ringStyle = hasError
    ? "focus:ring-functional-danger"
    : isOpen
    ? "ring-2 ring-golden-focus-ring" // Ring when open
    : "focus:ring-2 ring-golden-focus-ring"; // Ring when focused (and not open/error)

  const combinedContainerClassName = `mb-4 relative ${containerClassName}`; // Added relative

  // Styles for the floating label
  const baseLabelStyle = `absolute left-3 text-text-secondary text-sm font-medium transition-all duration-150 ease-in-out pointer-events-none z-10`;

  // Determine if label should be floated: Focused OR has selected values OR is open
  const isFloated = isFocused || selectedValues.length > 0 || isOpen;

  // Apply floating styles if isFloated is true
  const floatingLabelStyle = isFloated
    ? `
     top-2
     text-xs
     -translate-y-0
     ${hasError ? "text-functional-danger" : "text-golden-accent"}
     `
    : `
     top-1/2
     text-sm
     -translate-y-1/2
     ${
       hasError ? "text-functional-danger" : ""
     } // Apply error color initially if needed
     `;

  // Handlers to update focus state and call original handlers (Button does not have standard onFocus/onBlur props, but we can add listeners or use peer-focus)
  // For a button acting like an input, using peer-focus is simpler
  // The isFocused state isn't strictly needed if we rely on peer-focus and the other state variables (selectedValues.length, isOpen)

  return (
    <div className={combinedContainerClassName} ref={containerRef}>
      {/* Render label if provided - positioned absolutely */}
      {label && (
        <label
          htmlFor={selectId}
          // Apply conditional styles based on isFloated state
          className={`${baseLabelStyle} ${floatingLabelStyle}`}
        >
          {label}
          {/* Required indicator might not fit well with floating label */}
        </label>
      )}
      {/* Button to toggle dropdown - Use 'peer' class */}
      {/* Applying border and ring styles to this button */}
      {/* Added peer-focus styles directly to the button class */}
      <button
        type="button"
        ref={buttonRef}
        id={selectId}
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        // Added peer-focus styles here to trigger floating label
        className={`peer ${baseButtonStyle} ${borderStyle} ${ringStyle}`}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* Adjust span padding if needed due to pt-6 on button */}
        <span className="truncate pr-2">{getSelectedLabels()}</span>
        {isLoading ? (
          <LoadingIndicator size="sm" textColor="text-text-secondary" /> // Adjust path
        ) : (
          <svg
            className={`fill-current h-4 w-4 ml-1 text-text-secondary transform transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        )}
      </button>

      {isOpen && !isDisabled && (
        <ul
          className="absolute z-20 mt-1 w-full bg-dark-secondary border border-dark-border rounded shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
          aria-labelledby={label ? selectId : undefined}
        >
          {isLoading ? (
            <li className="px-3 py-2 text-sm text-text-secondary italic">
              <LoadingIndicator text="Loading..." size="sm" /> // Adjust path
            </li>
          ) : options.length > 0 ? (
            options.map((option) => {
              const valueStr = String(option.value);
              const isSelected = selectedValues.includes(valueStr);
              return (
                <li
                  key={valueStr}
                  onClick={() => !option.disabled && handleSelect(valueStr)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                    option.disabled
                      ? "opacity-50 cursor-not-allowed text-text-disabled"
                      : "hover:bg-dark-tertiary"
                  } ${
                    isSelected
                      ? "bg-golden-accent/20 font-medium text-text-primary"
                      : "text-text-primary"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-golden-accent"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-sm text-text-secondary italic">
              No options available
            </li>
          )}
        </ul>
      )}

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

export default MultiSelect;
