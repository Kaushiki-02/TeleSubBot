// app/(superadmin)/overview/page.tsx


import React, { useState, useEffect, useCallback } from "react";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import Button from "../../../components/ui/Button";
import { getDashboardSummary } from "../../../lib/apiClient";
import { DashboardSummaryResponse } from "../../../types";
import { getErrorMessage } from "../../../lib/utils";
import toast from "react-hot-toast";

// Simple Stat Card component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  description?: string;
}> = ({ title, value, description }) => (
  <div className="bg-dark-secondary p-4 rounded-lg shadow-md border border-dark-tertiary text-center">
    <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
      {title}
    </h3>
    <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
    {description && (
      <p className="text-xs text-text-secondary mt-1">{description}</p>
    )}
  </div>
);

export default function SuperAdminOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    console.log("Fetching dashboard summary...");
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(`Failed to load dashboard summary: ${message}`);
      toast.error(`Error loading summary: ${message}`, {
        id: "fetch-summary-error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingIndicator text="Loading overview data..." />;
    }
    if (error || !summary) {
      return (
        <ErrorMessage
          title="Error Loading Data"
          message={error || "Could not fetch summary."}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Users"
          value={summary.totalUsers}
          description="Verified users"
        />
        <StatCard title="Total Admins" value={summary.totalAdmins} />
        <StatCard
          title="Total Channels"
          value={summary.totalChannels}
          description={`${summary.totalActiveChannels} active`}
        />
        <StatCard
          title="Total Plans"
          value={summary.totalPlans}
          description={`${summary.totalActivePlans} active`}
        />
        <StatCard
          title="Active Subscriptions"
          value={summary.totalActiveSubscriptions}
        />
        <StatCard
          title="Recent Revenue (30d)"
          value={`₹${summary.recentRevenue.toFixed(2)}`}
        />
      </div>
    );
  };

  return (
    <div>
      <PageTitle
        title="System Overview"
        subtitle="Key metrics across the platform."
      />
      <div className="bg-dark-primary p-4 md:p-6 rounded-lg shadow-md min-h-[200px] flex flex-col justify-center border border-dark-tertiary">
        {renderContent()}
        {error && (
          <div className="mt-4 text-center">
            <Button onClick={fetchSummary}>Retry</Button>
          </div>
        )}
      </div>
    </div>
  );
}
