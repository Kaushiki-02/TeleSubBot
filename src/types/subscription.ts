// types/subscription.ts
import { Plan } from "./plan";
import { Channel } from "./channel";

export interface UserSubscription {
  _id: string;
  id: string;
  user_id: string;
  plan_id: string | Plan;
  link_id: string | { name: string; url_slug: string };
  channel_id: string | Channel;
  start_date: string;
  end_date: string;
  status: "active" | "expired" | "revoked" | "pending";
  // removed razorpay_payment_id?: string | null;
  // removed razorpay_order_id?: string | null;
  last_transaction_id?: string | null; // Kept, assuming API might provide for convenience
  from_subscription_id?: string | null;
  // removed is_managed_by_bot?: boolean;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
  channel?: Channel;
}
