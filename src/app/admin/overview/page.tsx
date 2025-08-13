import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

import toast from "react-hot-toast";
import PageTitle from "../../../components/ui/PageTitle";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { getAdminDashboardSummary } from "../../../lib/apiClient";
import { AdminDashboardSummaryResponse } from "../../../types";
import { getErrorMessage } from "../../../lib/utils";
import Select from "../../../components/ui/Select";

const PIE_COLORS = [
  "#ffbc06",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#f97316",
  "#6b7280",
];

const StatCard: React.FC<{
  title: string;
  value: string | number;
  description?: string;
}> = ({ title, value, description }) => (
  <div className="bg-dark-secondary p-6 rounded-lg shadow-md border border-dark-tertiary text-center">
    <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
      {title}
    </h3>
    <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
    {description && (
      <p className="text-xs text-text-secondary mt-1">{description}</p>
    )}
  </div>
);

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummaryResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const formatDefaultDate = (date: Date) => date.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(
    formatDefaultDate(firstDayOfMonth)
  );
  const [endDate, setEndDate] = useState<string>(
    formatDefaultDate(lastDayOfMonth)
  );
  const [aggregation, setaggregation] = useState<"mon" | "yer" | "day" | "none">("none")
  const aggregationOptions = [
    { val: "none", lab: "Default (Last 30 Days)" },
    { val: "day", lab: "Custom Range" },
    { val: "mon", lab: "Monthly" },
    { val: "yer", lab: "Yearly" },
  ] as const;
  const monthOptions = Array.from({ length: new Date().getMonth() + 1 }, (_, i) => ({
    val: i + 1,
    lab: new Date(0, i).toLocaleString("default", { month: "short" }).toUpperCase(),
  }));
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2025 + 1 }, (_, i) => {
    const year = 2025 + i;
    return { val: year.toString(), lab: year.toString() };
  });
  const [selectedMon, setSelectedMon] = useState(5)
  const [selectedYear, setSelectedYear] = useState(2025)

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
        const msg = "Please select a valid date range.";
        setError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }
      console.log(
        `Fetching summary for date range: ${startDate} to ${endDate} ${aggregation} ${selectedYear} ${selectedMon}`
      );

      const data = await getAdminDashboardSummary(startDate, endDate, aggregation, selectedYear, selectedMon);
      setSummary(data);
      if (
        data &&
        (data.dailyRevenue.length === 0 || data.revenueByChannel.length === 0)
      ) {
        toast("No data available for the selected date range.", { icon: "📊" });
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(`Failed to load dashboard summary: ${message}`);
      toast.error(`Error loading summary: ${message}`, {
        id: "admin-summary-error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [aggregation, selectedMon, selectedYear]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const renderDashboardContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-10">
          <LoadingIndicator size="lg" text="Loading dashboard data..." />
        </div>
      );
    }
    if (error || !summary) {
      return (
        <div className="py-10">
          <ErrorMessage
            title="Error Loading Dashboard"
            message={error || "Could not fetch summary."}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* More columns for wider screens */}
          <StatCard
            title="Total Revenue"
            value={`₹${summary.totalRevenue?.toFixed(2) ?? "N/A"}`}
          />
          {/* Use ?? 'N/A' for null/undefined */}
          <StatCard
            title="Total Renewals"
            value={summary.totalRenewals ?? "N/A"}
          />
          <StatCard
            title="Churn Rate (%)"
            value={
              summary.churnRate != null
                ? `${summary.churnRate.toFixed(2)}%`
                : "N/A"
            }
          />
          <StatCard
            title="Average Lifetime Value"
            value={`₹${summary.avgLifetimeValue?.toFixed(2) ?? "N/A"}`}
          />
          <StatCard
            title="Total Active Subscribers"
            value={summary.totalSubscribers ?? "N/A"}
          />{" "}
          {/* Clarified metric */}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-dark-secondary p-6 rounded-lg shadow border border-dark-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-dark-tertiary pb-2">
              Revenue Contribution by Channel
            </h3>
            {summary.revenueByChannel.length > 0 ? (
              <div className="w-full h-80 md:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.revenueByChannel}
                      dataKey="totalRevenue"
                      nameKey="channelName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                    // label={({ channelName, percent }) =>
                    //   `${channelName} (${(percent * 100).toFixed(0)}%)`
                    // }
                    >
                      {summary.revenueByChannel.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `₹${value.toFixed(2)}`}
                    />

                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-text-secondary text-sm py-10 text-center">
                No channel revenue data available for this period.
              </p>
            )}
          </div>

          <div className="bg-dark-secondary p-6 rounded-lg shadow border border-dark-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-dark-tertiary pb-2">
              {aggregationOptions.find((ag) => ag.val === aggregation).lab} Revenue
            </h3>
            {summary.dailyRevenue.length > 0 ? (
              <div className="w-full h-80 md:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.dailyRevenue}

                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                    <XAxis dataKey="_id" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip
                      cursor={false}
                      content={({ label, payload }) => {
                        const value = payload?.[0]?.value;
                        return (
                          <div className="p-2 bg-white rounded shadow text-sm text-gray-800">
                            <p><strong>{aggregation === "yer" ? "Month" : "Date"}:</strong> {label}</p>
                            <p><strong>Value:</strong> ₹{value?.toFixed(2)}</p>
                          </div>
                        );
                      }}
                      formatter={(value: number) => `₹${value.toFixed(2)}`}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#ffbc06"
                      barSize={30}
                      isAnimationActive={false}

                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-text-secondary text-sm py-10 text-center">
                No daily revenue data available for this period.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Outer spacing */}
      <PageTitle
        title="Admin Dashboard"
        subtitle="Overview of key channel metrics and performance."
      />
      {/* Refined subtitle */}
      {/* Main content container */}
      <div className="bg-dark-primary p-6 md:p-8 rounded-lg shadow-md border border-dark-tertiary">
        {/* Increased padding */}
        <Select
          id="aggregation"
          name="aggregation"
          label="Analytics By"
          placeholder=""
          value={aggregation || "none"}
          onChange={(e) => setaggregation(e.target.value as "mon" | "yer" | "day" | "none")}
          options={aggregationOptions.map((aggre) => ({
            value: aggre.val,
            label: aggre.lab,
          }))}
          className="bg-dark-secondary text-text-primary"
          containerClassName=""
        />
        {/* Date Range Selector */}
        {aggregation === "day" ?

          <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-dark-tertiary pb-6">
            {/* Added bottom border and padding */}
            {/* Using Input component for date pickers */}
            <Input
              label="Start Date"
              id="start-date"
              name="start-date"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              containerClassName="mb-0"
              disabled={isLoading}
            />
            <Input
              label="End Date"
              id="end-date"
              name="end-date"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              containerClassName="mb-0"
              disabled={isLoading}
            />
            {/* Apply Button */}
            <Button onClick={() => fetchSummary()} disabled={isLoading}>
              Apply Filter
            </Button>
            {/* Disabled while loading */}
          </div> :
          aggregation === "none" ?
            <></> :
            aggregation === "mon" ?
              <>
                <Select
                  id="selectedMonth"
                  name="selectedMonth"
                  label="Month"
                  placeholder="Select Month"
                  value={selectedMon.toString() || "1"}
                  onChange={(e) => setSelectedMon(Number(e.target.value))}
                  options={monthOptions.map((aggre) => ({
                    value: aggre.val,
                    label: aggre.lab,
                  }))}
                  className="bg-dark-secondary text-text-primary"
                  containerClassName=""
                />
                <Select
                  id="selectedYear"
                  name="selectedYear"
                  label="Year"
                  placeholder="Select Year"
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  options={yearOptions.map((aggre) => ({
                    value: aggre.val,
                    label: aggre.lab,
                  }))}
                  className="bg-dark-secondary text-text-primary"
                  containerClassName=""
                />
              </>
              :
              <Select
                id="selectedYear"
                name="selectedYear"
                label="Year"
                placeholder="Select Year"
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                options={yearOptions.map((aggre) => ({
                  value: aggre.val,
                  label: aggre.lab,
                }))}
                className="bg-dark-secondary text-text-primary"
                containerClassName=""
              />
        }

        {/* Render Dashboard Content (Stats, Charts, Errors, Loading) */}
        {renderDashboardContent()}
      </div>
    </div>
  );
}
