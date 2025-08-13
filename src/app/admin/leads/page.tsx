// app/(admin)/leads/page.tsx

import { useState, useEffect, useCallback } from "react";
import LoadingIndicator from "../../../components/ui/LoadingIndicator";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import TransactionTable from "../../../components/admin/TransactionTable";
import PaginationControls from "../../../components/ui/PaginationControls";
import Button from "../../../components/ui/Button";
import { getAdminChannels, getAdminChannelLeads } from "../../../lib/apiClient";
import {
  TransactionAdminResponse,
  PopulatedChannel,
  Channel,
} from "../../../types";
import { getErrorMessage, formatDate } from "../../../lib/utils"; // Import maskPhone
import toast from "react-hot-toast";
import EmptyState from "../../../components/ui/EmptyState";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCsv } from "@fortawesome/free-solid-svg-icons";

const ITEMS_PER_PAGE = 15; // Number of items per page

export default function ChannelSubscriptionsPage() {
  // State for channel details and subscriptions
  const [channels, setChannels] = useState<
    Channel[] | undefined | PopulatedChannel[]
  >([]);
  const [transactions, settransactions] = useState<TransactionAdminResponse[]>(
    []
  );
  const [filersubs, setfilersubs] = useState<TransactionAdminResponse[]>([]);
  const [filly, setfilly] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // Loading state for table/initial data
  const [error, setError] = useState<string | null>(null); // Error fetching data
  const [totalItems, setTotalItems] = useState(0); // Total count for pagination
  const [channelId, setchannelId] = useState("");
  // Filter State - Initialize from URL search params

  const [currentPage, setCurrentPage] = useState(1);
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
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };
  // Fetch Channel Details (e.g., for name in title) - runs once
  const fetchChannels = useCallback(async () => {
    console.log("Fetching admin channels...");
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminChannels(); // API returns channels owned by the admin
      setChannels(data);
      console.log(`Fetched ${data.length} channels.`);
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Failed to fetch channels:", message);
      setError(message);
      toast.error(`Error loading channels: ${message}`, {
        id: "fetch-channels-error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed

  // Initial fetch on mount
  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    let filteredUsers = transactions;

    const checkS = new Date(startDate);
    const checkE = new Date(endDate);
    if (checkS < checkE) {
      filteredUsers = filteredUsers.filter((tran) => {
        const createdAt = new Date(tran.createdAt);
        return createdAt >= checkS && createdAt <= checkE;
      });
    }
    if (channelId && channelId !== "") {
      filteredUsers = filteredUsers.filter((tran) => {
        const chan = tran.channel_id;
        return chan && typeof chan === "object"
          ? chan._id === channelId
          : chan === channelId;
      });
    }

    setfilersubs(filteredUsers);
  }, [transactions, filly, channelId]);

  // Memoized function to fetch transactions based on current filters/page
  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminChannelLeads(channelId);
      settransactions(data.transactions);
      setTotalItems(data.transactions.length);
      console.log(`Fetched ${transactions.length} transactions`);
    } catch (err) {
      const msg = getErrorMessage(err);
      console.error("Failed to fetch transactions:", msg);
      setError(msg);
      toast.error(`Error loading transactions: ${msg}`, {
        id: "fetch-subs-error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to trigger fetch when debounced filters or page change
  useEffect(() => {
    // Fetch using the debounced phone filter and current status/page
    fetchTransactions();
  }, []); // Re-run when these change

  // --- Filter & Pagination Handlers ---
  const handlePageChange = (newPage: number) => {
    // Let the useEffect trigger the fetch when currentPage state changes
    setCurrentPage(newPage);
  };

  const handleExportCSV = () => {
    if (!(filersubs.length ? filersubs : transactions).length) return;

    const headers = [
      "Phone",
      "Channel Name",
      "Plan Name",
      "Type",
      "Amount",
      "End Date",
      "Created At",
    ];

    const rows = (filersubs.length ? filersubs : transactions).map((sub) => {
      return [
        sub.user_id?.phone || "N/A",
        typeof sub.channel_id === "object" && sub.channel_id !== null
          ? sub.channel_id.name
          : typeof sub.channel_id === "string"
          ? sub.channel_id
          : "N/A",
        typeof sub.plan_id === "object" && sub.plan_id !== null
          ? sub.plan_id.name
          : typeof sub.plan_id === "string"
          ? sub.plan_id
          : "N/A",
        sub.type,
        sub.amount,
        sub.subscription_id &&
        typeof sub.subscription_id === "object" &&
        sub.subscription_id.end_date
          ? formatDate(sub.subscription_id.end_date)
          : "-",
        formatDate(sub.createdAt),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // --- Render Logic ---
  const renderSubscriptionContent = () => {
    // Show main loading indicator only on initial load or full refresh when no data is present
    if (isLoading && transactions.length === 0) {
      return (
        <div className="flex justify-center items-center min-h-[200px]">
          <LoadingIndicator text="Loading transactions..." />
        </div>
      );
    }

    // Show error message if fetching failed
    if (error) {
      return (
        <div className="text-center p-4">
          <ErrorMessage title="Error Loading transactions" message={error} />
          {/* Provide a retry button specific to the fetch function */}
          <Button onClick={() => fetchTransactions()} className="mt-4">
            Retry Load
          </Button>
        </div>
      );
    }

    // Show empty state if loading finished, no errors, and no results found
    if (!isLoading && transactions.length === 0) {
      const message =
        startDate || endDate
          ? "No transactions match the current filters."
          : "No transactions found for this channel yet.";
      return <EmptyState message={message}></EmptyState>;
    }
    const displaySubs =
      filersubs.length || startDate || channelId !== ""
        ? filersubs
        : transactions; // Show filtered users if filters are applied, even if filter result is empty

    // Render the table and pagination if data exists
    return (
      <>
        <TransactionTable transactions={displaySubs} isLoading={isLoading} />
        <PaginationControls
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
          className="px-4 py-3" // Add padding to pagination controls
        />
      </>
    );
  };

  return (
    <div>
      <div className="mb-6 rounded-lg shadow bg-dark-secondary border border-dark-tertiary">
        <div className="px-4 pt-4">
          <h2 className="text-lg font-semibold text-white mb-4">
            Transaction Date Filter
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4 pb-6">
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

          <Button
            onClick={() => {
              setfilly(!filly);
            }}
            disabled={isLoading}
          >
            Apply Filter
          </Button>
        </div>
        <div className="px-4 pt-4">
          <h2 className="text-lg font-semibold text-white mb-4">
            Channel Filter
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4 pb-6">
          <Select
            id="channel"
            name="channel"
            label="Channel"
            placeholder="Select Channel"
            value={channelId || "All Channels"}
            onChange={(e) => setchannelId(e.target.value || undefined)}
            options={[{ _id: "", name: "All Channels" }, ...channels].map(
              (channel) => ({
                value: channel._id,
                label: channel.name,
              })
            )}
            className="bg-dark-secondary text-text-primary"
            containerClassName=""
          />
          {handleExportCSV && (
            <Button
              onClick={handleExportCSV}
              variant="primary"
              className="w-full sm:w-auto ml-2"
              size="md"
            >
              <FontAwesomeIcon icon={faFileCsv} /> Export To CSV
            </Button>
          )}
        </div>
      </div>

      {/* Table and Pagination Section */}
      <div className="bg-dark-secondary rounded-lg shadow-md overflow-hidden">
        {/* Render table/loading/error/empty state */}
        {renderSubscriptionContent()}
      </div>
    </div>
  );
}
