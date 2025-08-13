// components/auth/LoginForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PhoneNumberInput from "../../components/ui/PhoneNumberInput";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import { requestOtp } from "../../lib/apiClient";
import { getErrorMessage, isValidE164 } from "../../lib/utils";
import toast from "react-hot-toast";
import { ROUTES, ROLES } from "../../lib/constants";

interface LoginFormProps {
  role: "User";
}

const LoginForm: React.FC<LoginFormProps> = ({ role }) => {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!phone.trim()) {
      setFormError("Phone number is required.");
      return;
    }
    if (!isValidE164(phone.trim())) {
      setFormError("Please enter a valid phone number (e.g., xxxxxxxxxx).");
      return;
    }

    if (role !== ROLES.USER) {
      setFormError("Incorrect role configuration for this form.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Sending OTP...");

    try {
      await requestOtp({ phone: phone.trim(), role: ROLES.USER });
      toast.success("OTP sent successfully! Check your WhatsApp.", {
        id: toastId,
      });

      router(
        `${ROUTES.VERIFY_OTP}?phone=${encodeURIComponent(
          phone.trim()
        )}&role=${encodeURIComponent(ROLES.USER)}`
      );
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("OTP Request Error:", message);
      setFormError(message);
      toast.error(`Failed to send OTP: ${message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(event.target.value);

    if (formError) {
      setFormError(null);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-dark-secondary p-8 rounded-lg shadow-md border border-dark-tertiary max-w-sm mx-auto"
    >
      <PhoneNumberInput
        label="Phone Number"
        value={phone}
        onChange={handlePhoneChange}
        required
        disabled={isLoading}
        name="phone"
        id="phone-login-user"
        placeholder="e.g., 1234567890"
      />
      {formError && <ErrorMessage message={formError} className="mt-4" />}{" "}
      <Button
        type="submit"
        isLoading={isLoading}
        disabled={isLoading || !phone.trim()}
        className="w-full mt-4"
        variant="primary"
      >
        Send OTP
      </Button>
    </form>
  );
};

export default LoginForm;
