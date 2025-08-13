// app/(auth)/login/page.tsx

import LoginForm from "../../../components/auth/LoginForm";
import { ROLES } from "../../../lib/constants";

export default function UserLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-primary p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-text-primary mb-2">
          Login
        </h1>
        <p className="text-center text-text-secondary mb-6">
          Enter your <span className="font-extrabold">WhatsApp Number </span>to receive an OTP.
        </p>
        <LoginForm role={ROLES.USER} />
      </div>
    </div>
  );
}
