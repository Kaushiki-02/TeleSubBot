// components/ui/PaginationControls.tsx
import React from 'react';
import Button from './Button'; // Assuming Button component exists

interface PaginationControlsProps {
  currentPage: number; // Current active page number
  totalItems: number; // Total number of items across all pages
  itemsPerPage: number; // Number of items displayed per page
  onPageChange: (page: number) => void; // Callback function when page changes
  className?: string; // Optional custom class for the container
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '', // Default empty class
}) => {
  // Calculate total number of pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Don't render pagination if there's only one page or less, or no items
  if (totalPages <= 1 || totalItems === 0) {
    return null;
  }

  // Handler for Previous button click
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  // Handler for Next button click
  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Function to generate the page numbers to display with ellipsis logic
   const getPageNumbers = (): (number | string)[] => {
        const delta = 1; // Number of pages to show around the current page
        const range: number[] = [];
        const rangeWithDots: (number | string)[] = [];
        let l: number | undefined; // Track the last number added

        // Always include the first page
        range.push(1);

        // Calculate pages around the current page
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        // Always include the last page (if different from first)
        if (totalPages > 1) {
            range.push(totalPages);
        }

        // Process the range to add ellipsis where gaps exist
        // Use Set to remove duplicates and sort
        const sortedUniqueRange = Array.from(new Set(range)).sort((a, b) => a - b);

         for (const i of sortedUniqueRange) {
            if (l !== undefined) {
                // Add ellipsis if gap is larger than 1
                if (i - l > 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

   const pageNumbers = getPageNumbers();

   // Calculate the range of items currently being displayed
   const startItem = (currentPage - 1) * itemsPerPage + 1;
   const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    // Container for pagination controls and info text
    <div className={`flex flex-col sm:flex-row items-center justify-between mt-4 md:mt-6 text-sm text-text-secondary ${className}`}>
        {/* Info text: "Showing X to Y of Z results" */}
        <div className="mb-2 sm:mb-0">
            Showing <span className="font-semibold text-text-primary">{startItem}</span>
            - <span className="font-semibold text-text-primary">{endItem}</span>
            {' '}of <span className="font-semibold text-text-primary">{totalItems}</span> results
        </div>

         {/* Pagination Buttons */}
        <div className="flex items-center space-x-1">
            {/* Previous Button */}
             <Button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                variant="secondary"
                size="sm"
                aria-label="Go to previous page"
            >
                &larr; {/* Left arrow */}
                {/* <span className="hidden sm:inline ml-1">Previous</span> */}
            </Button>

            {/* Page Number Buttons */}
            {pageNumbers.map((page, index) => (
                <React.Fragment key={index}>
                    {/* Render ellipsis as non-clickable text */}
                    {page === '...' ? (
                        <span className="px-2 py-1 text-text-secondary">...</span>
                    ) : (
                        // Render page number button
                        <Button
                            onClick={() => onPageChange(page as number)}
                            // Disable button if it's the current page
                            disabled={currentPage === page}
                            // Highlight current page button
                            variant={currentPage === page ? 'primary' : 'secondary'}
                            size="sm"
                            // Ensure minimum width for consistency
                            className="min-w-[32px] px-2"
                            aria-label={`Go to page ${page}`}
                            // Set aria-current for accessibility
                            aria-current={currentPage === page ? 'page' : undefined}
                        >
                            {page}
                        </Button>
                    )}
                </React.Fragment>
            ))}

            {/* Next Button */}
            <Button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                variant="secondary"
                size="sm"
                aria-label="Go to next page"
            >
                 {/* <span className="hidden sm:inline mr-1">Next</span> */}
                 &rarr; {/* Right arrow */}
            </Button>
        </div>
    </div>
  );
};

export default PaginationControls;
