// components/ui/Modal.tsx
import React, { ReactNode, useEffect, useRef } from "react";
import { useOutsideClick } from "../../lib/hooks"; // Import the custom hook

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"; // Added more sizes
  closeOnBackdropClick?: boolean; // Option to disable closing on backdrop click
  closeOnEscape?: boolean; // Option to disable closing on escape key
  // Allow passing custom classes for further customization
  backdropClassName?: string;
  modalClassName?: string;
  contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  backdropClassName = "",
  modalClassName = "",
  contentClassName = "",
}) => {
  const modalRef = useRef<HTMLDivElement>(null); // Ref for the modal content itself

  // Use custom hook to detect clicks outside the modal content
  useOutsideClick(modalRef as React.RefObject<HTMLElement>, () => {
    if (isOpen && closeOnBackdropClick) {
      onClose();
    }
  });

  // Handle Escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto"; // Restore scrolling when closed
    }

    // Cleanup function
    return () => {
      document.removeEventListener("keydown", handleEscape);
      // Ensure scrolling is re-enabled if component unmounts while open
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose, closeOnEscape]); // Dependencies for the effect

  // Don't render the modal if it's not open
  if (!isOpen) {
    return null;
  }

  // Tailwind classes for different modal widths
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    // Add more sizes if needed (e.g., '4xl', 'full')
  };

  const baseBackdropStyle =
    "fixed inset-0 z-50 flex items-center justify-center -top-20 bg-dark-primary/50 backdrop-blur-sm transition-opacity duration-200 ease-out";
  const baseModalStyle =
    "bg-dark-secondary rounded-lg shadow-xl w-full overflow-hidden transform transition-all duration-300 ease-out";
  const baseContentStyle =
    "p-6 text-text-on-accent max-h-[85vh] overflow-y-auto"; // Add max height and scroll

  const combinedBackdropClass = `${baseBackdropStyle} ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    } ${backdropClassName}`;
  const combinedModalClass = `${baseModalStyle} ${sizeClasses[size]} ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
    } ${modalClassName}`;
  const combinedContentClass = `${baseContentStyle} ${contentClassName}`;

  return (
    // Modal Backdrop / Overlay
    <div
      className={combinedBackdropClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined} // Accessibility: Link title
    // onClick={handleBackdropClick} // Replaced by useOutsideClick hook
    >
      {/* Modal Container/Panel */}
      <div
        ref={modalRef} // Assign ref to the modal panel itself
        className={combinedModalClass}
      // onClick={(e) => e.stopPropagation()} // Replaced by useOutsideClick hook logic
      >
        {/* Modal Header (Optional Title and Close Button) */}
        <div className="flex items-center justify-between p-4 border-b border-dark-tertiary">
          {title ? (
            <h2
              id="modal-title"
              className="text-lg font-semibold text-text-primary"
            >
              {title}
            </h2>
          ) : (
            <div />
          )}{" "}
          {/* Placeholder to keep close button aligned right */}
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-golden-focus-ring rounded-full p-1 transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content Area */}
        <div className={combinedContentClass}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
