// app/(auth)/verify-otp/page.tsx

import React, { useState, useEffect, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OtpInput from "../../../components/auth/OtpInput";
import Button from "../../../components/ui/Button";
import ResendOtp from "../../../components/auth/ResendOtp";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import { verifyOtp, requestOtp } from "../../../lib/apiClient";
import { useAuth } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../lib/utils";
import { ROLES, ROUTES } from "../../../lib/constants";
import toast from "react-hot-toast";

function VerifyOtpContent() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const router = useNavigate();
  const { login } = useAuth();

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const phone = searchParams.get("phone");
  const role = searchParams.get("role") as "User" | "Admin" | null;

  useEffect(() => {
    if (!phone || !role || !Object.values(ROLES).includes(role)) {
      console.error("Verify OTP: Missing or invalid query parameters.");
      toast.error("Invalid request. Please try logging in again.", {
        id: "verify-otp-param-error",
      });

      const redirectPath =
        role === ROLES.ADMIN ? ROUTES.LOGIN_ADMIN : ROUTES.LOGIN_USER;
      router(redirectPath, { replace: true });
    }
  }, [phone, role, router]);

  const handleOtpChange = (newOtp: string) => {
    setOtp(newOtp);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone || !role) {
      setError("Missing phone number or role context. Please restart login.");
      return;
    }
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyOtp({ phone, otp, role: ROLES.USER });

      toast.success("Login successful!", { id: "login-success" });

      login(response.token, response.data.user);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("OTP Verification Error:", message);
      setError(message);
      toast.error(`Verification failed: ${message}`, { id: "verify-error" });
      setIsLoading(false);
    }
  };

  const handleResendOtp = async (): Promise<boolean> => {
    if (!phone || !role) {
      setResendError("Cannot resend OTP. Phone/Role missing.");
      return false;
    }
    setResendError(null);
    setIsResendLoading(true);
    try {
      await requestOtp({ phone, role });
      toast.success("New OTP sent successfully!", { id: "resend-success" });
      setIsResendLoading(false);
      return true;
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("Resend OTP Error:", message);
      setResendError(message);
      toast.error(`Failed to resend OTP: ${message}`, { id: "resend-error" });
      setIsResendLoading(false);
      return false;
    }
  };

  if (!phone || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-primary p-4">
        <div className="w-full max-w-md text-center">
          <LoadingIndicator size="lg" />
          <p className="text-text-secondary mt-4">Loading details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-primary p-4">
      <div className="w-full max-w-md p-8 bg-dark-secondary rounded-lg shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-text-primary mb-4">
          Verify Your Identity
        </h1>
        <p className="text-center text-text-secondary mb-6 text-sm">
          Enter the 6-digit code sent to {phone}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <OtpInput length={6} onChange={handleOtpChange} />

          {error && <ErrorMessage message={error} />}

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading || otp.length !== 6}
            className="w-full"
            variant="primary"
          >
            Verify OTP & Login
          </Button>
        </form>

        <div className="mt-6 text-center">
          <ResendOtp onResend={handleResendOtp} isLoading={isResendLoading} />
          {resendError && (
            <ErrorMessage message={resendError} className="mt-2 text-xs" />
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router(-1)}
            className="text-sm text-golden-accent hover:text-golden-accent-hover hover:underline"
          >
            Change Phone Number?
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-dark-primary">
          <LoadingIndicator size="lg" text="Loading..." />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
