// components/auth/PasswordLoginForm.tsx

import React, { useState } from "react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import { loginPassword } from "../../lib/apiClient";
import { getErrorMessage } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const PasswordLoginForm: React.FC = () => {
  const { login } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLoginIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginId(e.target.value);
    if (formError) setFormError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formError) setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!loginId.trim() || !password.trim()) {
      setFormError("Login ID and Password are required.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(`Logging in...`);
    try {
      const response = await loginPassword({
        loginId: loginId.trim(),
        password: password.trim(),
      });
      toast.success(`Login successful!`, { id: toastId });

      login(response.token, response.data.user);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error(`Login Error:`, message);
      setFormError(message);
      toast.error(`Login failed: ${message}`, { id: toastId });
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
        label="Login ID"
        id="loginId"
        name="loginId"
        type="text"
        value={loginId}
        onChange={handleLoginIdChange}
        required
        disabled={isLoading}
        placeholder={`Enter your Login ID`}
        autoComplete="username"
      />
      <Input
        label="Password"
        id="password"
        name="password"
        type="password"
        value={password}
        onChange={handlePasswordChange}
        required
        disabled={isLoading}
        placeholder="Enter your password"
        autoComplete="current-password"
      />
      {formError && <ErrorMessage message={formError} className="mt-4" />}
      <Button
        type="submit"
        isLoading={isLoading}
        disabled={isLoading || !loginId.trim() || !password.trim()}
        className="w-full mt-4"
        variant="primary"
      >
        Login
      </Button>
    </form>
  );
};

export default PasswordLoginForm;
