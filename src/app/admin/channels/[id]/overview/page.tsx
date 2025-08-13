import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageTitle from "../../../../../components/ui/PageTitle";
import LoadingIndicator from "../../../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../../../components/ui/ErrorMessage";
import Button from "../../../../../components/ui/Button";
import {
  getChannelDashboardSummary,
  getChannelDetails,
} from "../../../../../lib/apiClient";
import { ChannelDashboardSummaryResponse, Plan } from "../../../../../types";
import { getErrorMessage } from "../../../../../lib/utils";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Bar,
  BarChart,
} from "recharts";
import { ROUTES } from "../../../../../lib/constants";
import Select from "../../../../../components/ui/Select";
import Input from "../../../../../components/ui/Input";
const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7f50",
  "#a1cfff",
  "#d0743c",
  "#8c564b",
];

const StatCard: React.FC<{ title: string; value: string | number }> = ({
  title,
  value,
}) => (
  <div className="bg-dark-secondary p-4 rounded-lg shadow-md border border-dark-tertiary text-center">
    <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
      {title}
    </h3>
    <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
  </div>
);

export default function ChannelDashboardPage() {
  const params = useParams();
  const router = useNavigate();

  const channelId = params.id as string;
  const [summary, setSummary] =
    useState<ChannelDashboardSummaryResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string | undefined>();
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchChannelPlans = async () => {
    try {
      const channelData = await getChannelDetails(channelId as string);

      if (channelData && channelData?.associated_plan_ids) {
        setPlans(channelData.associated_plan_ids);
      }
    } catch (err) {
      toast.error("Failed to fetch channel plans");
    }
  };

  const fetchSummary = async () => {
    if (!channelId) return;
    setIsLoading(true);
    setError(null);

    console.log(
      `Fetching summary for date range: ${startDate} to ${endDate} ${aggregation} ${selectedYear} ${selectedMon}`
    );
    try {
      const data = await getChannelDashboardSummary(
        channelId as string,
        new Date(startDate),
        new Date(endDate),
        aggregation,
        selectedYear,
        selectedMon,
        planId,
      );
      setSummary(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(`Failed to load dashboard: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchChannelPlans();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [aggregation, selectedMon, selectedYear, planId]);
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  return (
    <div>
      <Button
        onClick={() => router(ROUTES.ADMIN_CHANNELS)}
        variant="link"
        size="sm"
        className="mb-1 text-text-secondary hover:text-text-primary"
      >
        ← Back to My Channels
      </Button>
      <PageTitle
        title="Channel Overview"
        subtitle="Analytics dashboard for this channel"
      />

      <div className="bg-dark-primary p-4 md:p-6 rounded-lg shadow-md border border-dark-tertiary">

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
                  value={selectedMon || 1}
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
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 items-end">

          <div>
            <label htmlFor="plan" className="block text-text-secondary">
              Filter By Plan
            </label>
            <select
              id="plan"
              value={planId || ""}
              onChange={(e) => setPlanId(e.target.value || undefined)}
              className="mt-1 p-2 bg-dark-secondary text-text-primary border border-dark-tertiary rounded"
            >
              <option value="">All Plans</option>
              {plans.map((plan) => (
                <option key={plan._id} value={plan._id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dashboard Content */}
        {isLoading ? (
          <LoadingIndicator text="Loading dashboard..." />
        ) : error ? (
          <ErrorMessage title="Error Loading Dashboard" message={error} />
        ) : summary ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard
                title="Total Revenue"
                value={`₹${summary?.totalRevenue?.toFixed(2)}`}
              />
              <StatCard title="Total Renewals" value={summary?.totalRenewals} />
              <StatCard
                title="Churn Rate"
                value={`${summary?.churnRate?.toFixed(2)}%`}
              />
              <StatCard
                title="Average LTV"
                value={
                  summary?.avgLifetimeValue != null
                    ? `₹${summary?.avgLifetimeValue?.toFixed(2)}`
                    : "No Data"
                }
              />
              <StatCard
                title="Total Subscribers"
                value={summary?.totalSubscribers}
              />
            </div>
            {(!planId || planId === "") &&
              <div className="bg-dark-secondary p-4 rounded-lg shadow border border-dark-tertiary mt-6 w-full h-full">
                <h3 className="text-lg font-semibold mb-4 text-text-primary">
                  Revenue Contribution by Plan
                </h3>
                {summary.planContribution.length > 0 ? (
                  <div className="w-full h-80 md:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="totalRevenue"
                          isAnimationActive={true}
                          data={summary.planContribution}
                          nameKey="planName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(1)}%)`
                          }
                        >
                          {summary.planContribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          labelClassName="text-black"
                          formatter={(value: number) => `₹${value.toFixed(2)}`}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm">
                    No channel revenue data available.
                  </p>
                )}
              </div>
            }

            <div className="bg-dark-secondary p-4 rounded-lg shadow border border-dark-tertiary mt-6">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {aggregationOptions.find((ag) => ag.val === aggregation).lab} Revenue
              </h3>
              {summary.dailyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.dailyRevenue}>
                    <CartesianGrid stroke="#444" />
                    <XAxis dataKey="_id" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    {/* <Tooltip labelClassName="text-black" /> */}
                    <Tooltip
                      cursor={false}
                      content={({ label, payload }) => {
                        const value = payload?.[0]?.value;
                        return (
                          <div className="p-2 bg-white rounded shadow text-sm text-gray-800">
                            <p><strong>Date:</strong> {label}</p>
                            <p><strong>Value:</strong> ₹{value?.toFixed(2)}</p>
                          </div>
                        );
                      }}
                      formatter={(value: number) => `₹${value.toFixed(2)}`}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#8884d8"
                      barSize={30} // Optional: adjust bar width
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-text-secondary">
                  No revenue data available.
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
