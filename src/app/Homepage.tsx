// app/page.tsx
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { useNavigate, Link } from "react-router-dom";
import { ROUTES, ROLES } from '../lib/constants';

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  const router = useNavigate();
  useEffect(() => {
    // Only redirect logic when loading is finished
    if (!isLoading) {
      if (isAuthenticated && user?.role) {
        // User is authenticated, redirect based on role
        const redirectPath = user.role === ROLES.ADMIN ? ROUTES.ADMIN_DASHBOARD : ROUTES.USER_DASHBOARD;
        console.log(`HomePage: Auth loaded. User authenticated (${user.role}). Redirecting to ${redirectPath}`);
        router(redirectPath, { replace: true }); // Use replace to avoid adding landing page to history
      } else {
        // User is not authenticated (and loading is finished)
        console.log("HomePage: Auth loaded. User not authenticated. Displaying login options.");
        // No redirect needed, the component will render the login links below.
      }
    } else {
      // Auth state is still being determined
      console.log("HomePage: Auth state still loading...");
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Show loading indicator ONLY while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-primary">
        <LoadingIndicator size="lg" text="Loading application..." />
      </div>
    );
  }

  // If loading is finished and user is NOT authenticated, render login options
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-primary text-text-primary p-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-golden-accent">
          Welcome to the CRM
        </h1>
        <p className="mb-8 text-text-secondary text-center max-w-md">
          Your central hub for managing Telegram Channel Subscriptions efficiently. Please log in to continue.
        </p>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full max-w-xs sm:max-w-sm justify-center">
          <Link
            to={ROUTES.LOGIN_USER}
            className="w-full sm:w-auto text-center px-6 py-2 bg-golden-accent text-text-on-accent font-semibold rounded hover:bg-golden-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-golden-focus-ring transition"
          >
            User Login
          </Link>
          {/* <Link
            href={ROUTES.LOGIN_ADMIN}
            className="w-full sm:w-auto text-center px-6 py-2 bg-functional-success text-text-on-accent font-semibold rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-functional-success transition"
          >
            Admin Login
          </Link> */}
          {/* Add SuperAdmin login link later if needed */}
        </div>
      </div>
    );
  }


  // Fallback content while authenticated user is being redirected (should be brief)
  // This state should ideally not be visible for long due to the redirect in useEffect.
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-primary">
      <LoadingIndicator size="lg" />
      <p className="ml-4 text-text-secondary">Redirecting to your dashboard...</p>
    </div>
  );
}
