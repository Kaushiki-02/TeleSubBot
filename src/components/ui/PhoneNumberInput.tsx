// components/ui/PhoneNumberInput.tsx

import React, { useState, ChangeEvent, FocusEvent } from "react";
import Input from "./Input";
import { isValidE164 } from "../../lib/utils";

interface PhoneNumberInputProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  containerClassName?: string;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  label = "Phone Number",
  placeholder = "e.g., 1234567890",
  disabled,
  required,
  name = "phone",
  id,
  className,
  containerClassName,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    const filteredValue = raw.replace(/\D/g, "");

    const ev = {
      ...e,
      target: {
        ...e.target,
        value: filteredValue,
      },
    } as ChangeEvent<HTMLInputElement>;

    onChange(ev);

    if (
      filteredValue &&
      !(
        filteredValue.length === 10 ||
        (filteredValue.startsWith("+") && isValidE164(filteredValue))
      )
    ) {
      setValidationError("Enter 10 digits (e.g. 1234567890).");
    } else {
      setValidationError(null);
    }
  };

  const handleInputBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (
      value &&
      !(value.length === 10 || (value.startsWith("+") && isValidE164(value)))
    ) {
      setValidationError("Enter 10 digits (e.g. 1234567890).");
    } else {
      setValidationError(null);
    }
    onBlur?.(e);
  };

  const handleInputFocus = (e: FocusEvent<HTMLInputElement>) => {
    onFocus?.(e);
  };

  return (
    <Input
      label={label}
      id={id || name}
      name={name}
      type="tel"
      value={value}
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      onFocus={handleInputFocus}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={validationError}
      className={className}
      containerClassName={containerClassName}
      autoComplete="tel"
      autoCorrect="off"
      spellCheck="false"
    />
  );
};

export default PhoneNumberInput;
