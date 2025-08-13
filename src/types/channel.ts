// types/channel.ts
import { Plan } from "./plan";

export interface Channel {
  _id: string;
  name: string;
  owner:
    | string
    | { _id: string; phone?: string; name?: string; loginId?: string };
  telegram_chat_id: string;
  description?: string | null;
  associated_plan_ids?: string[];
  reminder_template_override_id?: string | null;
  reminder_days_override?: number | null;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  referralCode?: string | null;
  couponCode: string;
  couponDiscount?: number | null;
}

export interface PopulatedChannel extends Omit<Channel, "associated_plan_ids"> {
  associated_plan_ids: Plan[]; // Field name matches backend, but type is populated Plan
}
