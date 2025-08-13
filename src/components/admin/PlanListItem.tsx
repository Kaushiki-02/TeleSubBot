// components/admin/PlanListItem.tsx
import React from "react";
import { Plan } from "../../types";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import LoadingIndicator from "../ui/LoadingIndicator";
import {
  faPenToSquare,
  faToggleOn,
  faToggleOff,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface PlanListItemProps {
  plan: Plan;
  isLoading?: boolean;
  onEdit: () => void;
  onToggleActive: (plan_id: string, isActive: boolean) => void;
  onDeletePlan: (plan_id: string) => void;
}

const PlanListItem: React.FC<PlanListItemProps> = ({
  plan,
  isLoading = false,
  onEdit,
  onToggleActive,
  onDeletePlan,
}) => {
  const {
    _id,
    name,
    markup_price,
    discounted_price,
    validity_days,
    is_active,
    description,
  } = plan;

  const handleToggleClick = async () => {
    await onToggleActive(_id, !is_active);
  };

  const handleRemoveClick = async () => {
    await onDeletePlan(plan._id);
  };

  return (
    // Apply enhanced container styling and hover
    <div className="bg-dark-primary p-4 rounded-lg shadow hover:shadow-md transition-all duration-200 ease-in-out border border-dark-tertiary hover:border-golden-accent flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 relative overflow-hidden">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10 rounded-lg">
          <LoadingIndicator size="sm" textColor="text-text-primary" />
          {/* Adjust path if necessary */}
        </div>
      )}
      {/* Plan Information */}
      <div className="flex-grow mr-4 overflow-hidden">
        <div className="flex items-center gap-3 mb-1">
          <h3
            className="text-base sm:text-lg font-semibold text-text-primary truncate"
            title={name}
          >
            {name}
          </h3>
          <Badge status={is_active ? "active" : "inactive"} size="sm" />
          {/* Adjust path if necessary */}
        </div>
        {/* Updated Price display */}
        <div className="text-sm text-text-secondary space-x-2 sm:space-x-3 flex flex-wrap items-center">
          {markup_price != null &&
            markup_price > discounted_price && ( // Show markup only if > discounted
              <span>
                Price:{" "}
                <span
                  className={`font-medium ${
                    discounted_price !== null
                      ? "line-through text-text-disabled"
                      : "text-functional-success"
                  }`}
                >
                  ₹{markup_price}
                </span>
              </span>
            )}
          {/* Always show discounted_price */}
          {discounted_price !== null && (
            <span className="font-medium text-functional-success">
              ₹{discounted_price}
            </span>
          )}
          <span>|</span>
          <span>
            Validity:
            <span className="font-medium text-text-primary">
              {validity_days} day{validity_days !== 1 ? "s" : ""}
            </span>
          </span>
        </div>
        {description && (
          <p
            className="text-xs text-text-secondary mt-0.5 truncate"
            title={description}
          >
            {description}
          </p>
        )}
      </div>
      {/* Action Buttons */}
      <div className="flex flex-shrink-0 flex-wrap gap-2 justify-end">
        <Button
          onClick={onEdit}
          variant="info"
          size="sm"
          disabled={isLoading}
          title="Edit Plan Details"
        >
          <FontAwesomeIcon icon={faPenToSquare} className="mr-1" />
          Edit
        </Button>
        <Button
          onClick={handleToggleClick}
          variant={is_active ? "warning" : "success"}
          size="sm"
          disabled={isLoading}
          title={is_active ? "Deactivate Plan" : "Activate Plan"}
        >
          <FontAwesomeIcon
            icon={is_active ? faToggleOff : faToggleOn}
            className="mr-1"
          />
          {is_active ? "Deactivate" : "Activate"}
        </Button>
        <Button
          onClick={handleRemoveClick}
          variant="danger"
          size="sm"
          disabled={isLoading}
          title="Delete Plan"
        >
          <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
};

export default PlanListItem;
