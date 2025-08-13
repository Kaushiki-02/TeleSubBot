import React, { ReactNode } from "react";

interface TableProps {
  headers: ReactNode[];
  children: ReactNode;
  isLoading?: boolean;
  loadingRowCount?: number;
  className?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
}

const Table: React.FC<TableProps> = ({
  headers,
  children,
  isLoading = false,
  loadingRowCount = 5,
  className = "",
  tableClassName = "",
  theadClassName = "",
  tbodyClassName = "",
}) => {
  const renderLoadingRows = () => {
    return Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
      <tr key={`loading-row-${rowIndex}`} className="animate-pulse">
        {headers.map((_, colIndex) => (
          <td
            key={`loading-cell-${rowIndex}-${colIndex}`}
            className="px-4 py-3 whitespace-nowrap text-sm"
          >
            <div className="h-4 bg-dark-tertiary rounded w-3/4"></div>
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div
      className={`overflow-x-auto border border-dark-tertiary rounded-lg ${className}`}
    >
      <table
        className={`min-w-full divide-y divide-dark-tertiary ${tableClassName}`}
      >
        <thead className={`bg-dark-secondary ${theadClassName}`}>
          <tr>{headers}</tr>
        </thead>
        <tbody
          className={`bg-dark-secondary divide-y divide-dark-tertiary ${tbodyClassName}`}
        >
          {isLoading ? renderLoadingRows() : children}
        </tbody>
      </table>
    </div>
  );
};

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
export const Th: React.FC<ThProps> = ({
  children,
  className = "",
  ...props
}) => (
  <th
    scope="col"
    className={`px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider ${className}`}
    {...props}
  >
    {children}
  </th>
);

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}
export const Td: React.FC<TdProps> = ({
  children,
  className = "",
  ...props
}) => (
  <td
    className={`px-4 py-3 whitespace-nowrap text-sm text-text-primary ${className}`}
    {...props}
  >
    {children}
  </td>
);

export default Table;
