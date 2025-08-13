// components/admin/SubscriptionTable.tsx
import React from "react";
import Table, { Th, Td } from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { SubscriptionAdminResponse } from "../../types";
import { formatDate } from "../../lib/utils";
import { SUBSCRIPTION_STATUS } from "../../lib/constants";

interface SubscriptionTableProps {
  subscriptions: SubscriptionAdminResponse[];
  isLoading: boolean;
  onExtend: (subscription: SubscriptionAdminResponse) => void;
  onRevoke: (subscription: SubscriptionAdminResponse) => void;
}

const SubscriptionTable: React.FC<SubscriptionTableProps> = ({
  subscriptions,
  isLoading,
  onExtend,
  onRevoke,
}) => {
  const headers = [
    <Th className="bg-" key="phone">User Phone</Th>,
    <Th key="plan">Plan Name</Th>,
    <Th key="status">Status</Th>,
    <Th key="subon">Sub On</Th>,
    <Th key="end_date">End Date</Th>,
    <Th key="pan_number">Pan Number</Th>,
    <Th key="aadhar_number">Aadhar Number</Th>,
    <Th key="actions"
      className="text-right sticky right-0 z-10 bg-[#191919]"
    >
      Actions
    </Th>,
  ];

  return (
    <Table headers={headers} isLoading={isLoading} loadingRowCount={10}>
      {/* Map over subscriptions to create table rows */}
      {/* Added hover effect to table rows */}
      {subscriptions.map((sub, index) => (
        <tr
          key={sub._id || index}
          className="hover:bg-dark-tertiary/30 transition-colors duration-150"
        >

          {/* Use sub._id as key if available, add hover effect */}
          <Td>{sub.user_id.phone || "N/A"}</Td>
          <Td>
            {/* Check if associated_plan_ids includes the plan ID */}
            <p className=
              {typeof sub.channel_id === "object" &&
                Array.isArray(sub.channel_id.associated_plan_ids) &&
                !sub.channel_id.associated_plan_ids.includes(
                  typeof sub.plan_id === "object" && sub.plan_id !== null
                    ? sub.plan_id._id
                    : typeof sub.plan_id === "string" ? sub.plan_id : null
                ) && "text-red-500"}>

              {/* Show the plan name or fallback */}
              {typeof sub.plan_id === "object" && sub.plan_id !== null ? (
                <p>{sub.plan_id.name}</p>
              ) : typeof sub.plan_id === "string" ? (
                <p>{sub.plan_id}</p>
              ) : (
                <p className="text-red-500">N/A</p>
              )}
            </p>
          </Td>
          <Td>
            <Badge status={sub.status} size="sm" />
            {/* Adjust path if necessary */}
          </Td>
          <Td>{formatDate(sub.createdAt)}</Td>
          <Td>{formatDate(sub.end_date)}</Td>
          <Td>{sub.user_id.pan_number || <p className="text-red-500">Pending</p>}</Td>
          <Td>{sub.user_id.aadhar_number || <p className="text-red-500">Pending</p>}</Td>
          <Td
            className="text-right sticky right-0 z-10 bg-[#191919]"
          >
            <div className="flex justify-end space-x-2">
              {/* Extend Button */}
              {(sub.status === SUBSCRIPTION_STATUS.ACTIVE ||
                sub.status === SUBSCRIPTION_STATUS.EXPIRED) && (
                  <Button
                    onClick={() => onExtend(sub)}
                    variant="secondary"
                    size="sm"
                    title="Extend Subscription"
                  >
                    Extend
                  </Button>
                )}
              {/* Revoke Button */}
              {sub.status === SUBSCRIPTION_STATUS.ACTIVE && (
                <Button
                  onClick={() => onRevoke(sub)}
                  variant="danger"
                  size="sm"
                  title="Revoke Subscription"
                >
                  Revoke
                </Button>
              )}
            </div>
          </Td>
        </tr>
      ))}
    </Table>
  );
};

export default SubscriptionTable;
