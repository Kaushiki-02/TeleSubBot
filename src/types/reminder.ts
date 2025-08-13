// types/reminder.ts
export interface ReminderTemplate {
    id: string;
    name: string;
    // removed subject
    content: string; // Changed from body
    type: 'pre-expiry' | 'custom'; // Changed enum
    is_default: boolean;
    // Added from model
    days_before_expiry?: number;
    is_active: boolean;
    // removed created_by
    createdAt: string;
    updatedAt: string;
}

// Represents a delivery report for a sent reminder (if needed later)
// export interface ReminderDeliveryReport {
//     id: string;
//     subscription_id: string;
//     template_id: string;
//     sent_at: string; // ISO Date string
//     status: 'sent' | 'delivered' | 'failed' | 'read'; // Delivery status
//     recipient_phone: string;
//     error_message?: string | null;
// }
