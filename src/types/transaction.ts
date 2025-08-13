// types/transaction.ts
export interface Transaction {
  id: string;
  user_id: string;
  plan_id: string;
  channel_id: string;
  subscription_id?: string | null;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  razorpay_invoice_id?: string | null; // Changed from invoice_id
  invoice_url?: string | null;
  link_slug_used?: string | null;
  renewal_for_subscription_id?: string | null;
  created_at: string;
  captured_at?: string | null;
  createdAt: string;
  updatedAt: string;
}