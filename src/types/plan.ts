// types/plan.ts
// Import minimal Channel structure needed if channel_id is populated
interface ChannelBasicInfo {
  _id: string;
  name: string;
  owner?: string | { _id: string; phone?: string; name?: string; }; // Owner might also be populated
}


export interface Plan {
_id: string;
id?: string; // Virtual ID if needed
name: string;
description?: string | null;
markup_price: number | null;
discounted_price?: number;
validity_days: number;
is_active: boolean;
// channel_id can be string ID or populated ChannelBasicInfo object (SA view)
channel_id: string | ChannelBasicInfo; // Use basic info type
createdAt: string;
updatedAt: string;
}