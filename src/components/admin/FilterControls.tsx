// components/admin/FilterControls.tsx
import React from "react";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCsv } from "@fortawesome/free-solid-svg-icons";
interface FilterOption {
  value: string;
  label: string;
}

interface FilterControlsProps {
  phoneFilter: string;
  statusFilter: string;
  onFilterChange: (filters: { phone?: string; status?: string }) => void;
  statusOptions: FilterOption[];
  className?: string;
  handleExportCSV?: () => void;
  phoneLabel?: string;
  statusLabel?: string;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  phoneFilter,
  statusFilter,
  onFilterChange,
  statusOptions,
  className = "",
  phoneLabel,
  statusLabel,
  handleExportCSV = undefined
}) => {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ phone: e.target.value, status: statusFilter });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ phone: phoneFilter, status: e.target.value });
  };

  const handleClear = () => {
    onFilterChange({ phone: "", status: "" });
  };

  const canClear = !!phoneFilter || !!statusFilter;

  return (
    <div
      className={`mb-6 rounded-lg shadow bg-dark-secondary border border-dark-tertiary items-end ${className}`}>
      <div className="px-4 pt-4">
        <h2 className="text-lg font-semibold text-white mb-4">
          Filter Controls
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-4 px-4 pb-6">

        <Input
          label={phoneLabel || "User Phone/ID"}
          id="phoneFilter"
          name="phoneFilter"
          value={phoneFilter}
          onChange={handlePhoneChange}
          placeholder="Enter phone or ID..."
          containerClassName="mb-0"
          type="text"
        />
        <Select
          label={statusLabel || "Status"}
          id="statusFilter"
          name="statusFilter"
          options={statusOptions}
          value={statusFilter}
          onChange={handleStatusChange}
          containerClassName="mb-0"
        />
        {/* Position in the third column on medium screens and up */}
        <div className="sm:col-span-2 md:col-span-1 flex justify-start md:justify-end md:mt-0">
          {/* Adjust justify-start on small/medium to use full width */}
          <Button
            onClick={handleClear}
            size="md"
            disabled={!canClear}
            className="w-full sm:w-auto"
          >
            Clear Filters
          </Button>
          {handleExportCSV &&
            <Button onClick={handleExportCSV} variant="primary"
              className="w-full sm:w-auto ml-2"
              size="md">
              <FontAwesomeIcon icon={faFileCsv} /> Export To CSV
            </Button>
          }
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
