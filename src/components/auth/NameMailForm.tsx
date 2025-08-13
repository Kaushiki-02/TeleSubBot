// components/auth/LoginForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";
import { submitnamemail } from "../../lib/apiClient";
import { getErrorMessage } from "../../lib/utils";
import toast from "react-hot-toast";
import { ROUTES } from "../../lib/constants";
import Input from "../../components/ui/Input";

interface LoginFormProps {
  role: "User";
}

const LoginForm: React.FC<LoginFormProps> = ({ role }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim()) {
      setFormError("Both name and email are required.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Submitting...");

    try {
      await submitnamemail({ name, email });
      toast.success("Submitted successfully!", { id: toastId });

      let redirectPath: string = ROUTES.USER_DASHBOARD;


      console.log(
        `NameMail: Redirecting to default: ${redirectPath}`
      );
      router(redirectPath, { replace: true });

    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("Submission Error:", message);
      setFormError(message);
      toast.error(`Submission failed: ${message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-dark-secondary p-8 rounded-lg shadow-md border border-dark-tertiary max-w-sm mx-auto"
    >
      <Input
        label="Full Name"
        id="name"
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        disabled={isLoading}
        required
        autoComplete="off"
      />
      <Input
        label="Email Address"
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        disabled={isLoading}
        required
        autoComplete="off"
      />
      {formError && <ErrorMessage message={formError} className="mt-4" />}
      <Button
        type="submit"
        isLoading={isLoading}
        disabled={isLoading || !name.trim() || !email.trim()}
        className="w-full mt-4"
        variant="primary"
      >
        Submit
      </Button>
    </form>
  );
};

export default LoginForm;
