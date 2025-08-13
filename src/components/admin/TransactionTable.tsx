// components/admin/SubscriptionTable.tsx
import React from "react";
import Table, { Th, Td } from "../ui/Table";
import Badge from "../ui/Badge";
import { TransactionAdminResponse } from "../../types";
import { formatDate } from "../../lib/utils";

interface SubscriptionTableProps {
  transactions: TransactionAdminResponse[];
  isLoading: boolean;
}

const SubscriptionTable: React.FC<SubscriptionTableProps> = ({
  transactions,
  isLoading,
}) => {
  const headers = [
    <Th className="bg-" key="phone">
      User Phone
    </Th>,
    <Th key="channel">Channel Name</Th>,
    <Th key="plan">Plan Name</Th>,
    <Th key="type">Type</Th>,
    <Th key="amount">Amount</Th>,
    <Th key="end_date">End Date</Th>,
    <Th key="createdAt">Created At</Th>,
  ];

  return (
    <Table headers={headers} isLoading={isLoading} loadingRowCount={10}>
      {/* Map over transactions to create table rows */}
      {/* Added hover effect to table rows */}
      {transactions.map((tran, index) => (
        <tr
          key={tran._id || index}
          className="hover:bg-dark-tertiary/30 transition-colors duration-150"
        >
          {/* Use tran._id as key if available, add hover effect */}
          <Td>{tran.user_id?.phone || "N/A"}</Td>
          <Td>
            {/* Safely access plan name */}
            {typeof tran.channel_id === "object" && tran.channel_id !== null
              ? tran.channel_id.name
              : typeof tran.channel_id === "string"
                ? tran.channel_id
                : "N/A"}
          </Td>
          <Td>
            {/* Safely access plan name */}
            {typeof tran.plan_id === "object" && tran.plan_id !== null
              ? tran.plan_id.name
              : typeof tran.plan_id === "string"
                ? tran.plan_id
                : "N/A"}
          </Td>
          <Td>
            <Badge status={tran.type} size="sm" className="-ml-3" />
            {/* Adjust path if necessary */}
          </Td>
          <Td>
            ₹ {tran.amount}
            {/* Adjust path if necessary */}
          </Td>
          <Td>
            {tran.subscription_id &&
              typeof tran.subscription_id === "object" &&
              tran.subscription_id.end_date
              ? formatDate(tran.subscription_id.end_date)
              : "-"}
          </Td>

          <Td>{formatDate(tran.createdAt)}</Td>
        </tr>
      ))}
    </Table>
  );
};

export default SubscriptionTable;
