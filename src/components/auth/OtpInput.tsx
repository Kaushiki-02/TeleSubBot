// components/auth/OtpInput.tsx
import React, { useState, useRef, ChangeEvent, KeyboardEvent } from "react";

interface OtpInputProps {
  length: number;
  onChange: (otp: string) => void;
  disabled?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({
  length,
  onChange,
  disabled = false,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    const digit = value.match(/\d/)?.[0];

    if (digit || value === "") {
      const newOtp = [...otp];
      newOtp[index] = digit || "";
      setOtp(newOtp);
      onChange(newOtp.join(""));

      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowRight") {
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pasteData.length > 0) {
      const currentFocusIndex = inputRefs.current.findIndex(
        (ref) => ref === document.activeElement
      );
      const startIndex = currentFocusIndex >= 0 ? currentFocusIndex : 0;

      const newOtp = [...otp];
      let pasteIndex = 0;
      let focusIndex = startIndex;

      while (pasteIndex < pasteData.length && focusIndex < length) {
        newOtp[focusIndex] = pasteData[pasteIndex];
        focusIndex++;
        pasteIndex++;
      }

      setOtp(newOtp);
      onChange(newOtp.join(""));

      const nextFocusIndex = Math.min(focusIndex, length - 1);
      const lastInputIndex = startIndex + pasteData.length - 1;
      const finalFocusIndex =
        lastInputIndex < length ? lastInputIndex + 1 : length - 1;

      inputRefs.current[finalFocusIndex >= 0 ? finalFocusIndex : 0]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={otp[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={disabled}
          className={`w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold bg-dark-tertiary border-2 rounded-md text-text-primary focus:outline-none focus:ring-2 transition duration-150 ease-in-out
            ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "border-dark-border focus:ring-golden-focus-ring focus:border-golden-accent hover:border-golden-subtle" // Added hover style
            }`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
        />
      ))}
    </div>
  );
};

export default OtpInput;
