// app/(auth)/verify-otp/page.tsx

import { useEffect, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NameMailForm from "../../../components/auth/NameMailForm";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import { ROLES, ROUTES } from "../../../lib/constants";
import toast from "react-hot-toast";

function AddNameMailContent() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const router = useNavigate();

  const role = searchParams.get("role") as "User" | null;

  useEffect(() => {
    if (!role || !Object.values(ROLES).includes(role)) {
      console.error("Name And Mail: Missing or invalid query parameters.");
      toast.error("Invalid request. Please try logging in again.", {
        id: "name-email-param-error",
      });

      const redirectPath = ROUTES.LOGIN_USER;
      router(redirectPath, { replace: true });
    }
  }, [role, router]);



  if (!role) {
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
          Name and Email
        </h1>
        <p className="text-center text-text-secondary mb-6 text-sm">
          Please Add your name and email.
        </p>

        <NameMailForm role={role} />

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
      <AddNameMailContent />
    </Suspense>
  );
}
