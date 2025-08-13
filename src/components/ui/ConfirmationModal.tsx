// components/ui/ConfirmationModal.tsx
import React from 'react';
import Modal from './Modal';
import Button from './Button';

// Define ButtonVariant types based on the Button component's variants
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info' | 'link';


interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void; // Function to execute on confirmation
  title: string; // Modal title (required)
  message: string | React.ReactNode; // Message content (can be complex JSX)
  confirmText?: string; // Text for the confirm button (default: "Confirm")
  cancelText?: string; // Text for the cancel button (default: "Cancel")
  // Type the variant using the defined ButtonVariant type
  confirmButtonVariant?: ButtonVariant;
  isLoading?: boolean; // Show loading state on the confirm button
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  // Default confirm button variant to 'primary', can be overridden (e.g., 'danger' for delete)
  confirmButtonVariant = 'primary',
  isLoading = false,
}) => {
  return (
    // Use the base Modal component
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {/* Render the message content */}
        <div className="text-sm text-text-secondary">
            {message}
        </div>


        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-dark-tertiary mt-4">
           {/* Cancel Button */}
          <Button
            variant="secondary" // Always secondary style for cancel
            onClick={onClose}
            disabled={isLoading} // Disable if confirm action is loading
          >
            {cancelText}
          </Button>
          {/* Confirm Button */}
          <Button
            // Use the specified variant for the confirm button
            variant={confirmButtonVariant}
            onClick={onConfirm}
            isLoading={isLoading} // Show loading indicator if true
            disabled={isLoading} // Disable button while loading
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
