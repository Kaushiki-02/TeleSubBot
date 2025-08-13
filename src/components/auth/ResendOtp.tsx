// components/auth/ResendOtp.tsx

import React from "react";
import Button from "../../components/ui/Button";
import { useTimer } from "../../lib/hooks";

interface ResendOtpProps {
  onResend: () => Promise<boolean>;
  isLoading: boolean;
  cooldownSeconds?: number;
}

const ResendOtp: React.FC<ResendOtpProps> = ({
  onResend,
  isLoading,
  cooldownSeconds = 60,
}) => {
  const [secondsLeft, startTimer, isTimerActive] = useTimer(cooldownSeconds);

  const handleResendClick = async () => {
    if (isLoading || isTimerActive) return;
    try {
      const success = await onResend();
      if (success) {
        startTimer();
      }
    } catch (error) {
      console.error("Error during OTP resend:", error);
    }
  };

  return (
    <div className="flex justify-center mt-4">
      {isTimerActive ? (
        <p className="text-sm text-text-secondary">
          Resend OTP in
          <strong className="text-golden-accent"> {secondsLeft}s</strong>
        </p>
      ) : (
        <Button
          variant="link"
          size="sm"
          onClick={handleResendClick}
          isLoading={isLoading}
          disabled={isLoading || isTimerActive}
          className="text-golden-accent hover:text-golden-accent-hover"
        >
          Resend OTP
        </Button>
      )}
    </div>
  );
};

export default ResendOtp;
