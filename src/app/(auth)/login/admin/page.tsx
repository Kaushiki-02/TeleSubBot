// app/(auth)/login/admin/page.tsx

import PasswordLoginForm from "../../../../components/auth/PasswordLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-primary p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-text-primary mb-2">
          Admin Login
        </h1>
        <p className="text-center text-text-secondary mb-6">
          Enter your Admin Login ID and Password.
        </p>
        <PasswordLoginForm />
      </div>
    </div>
  );
}
