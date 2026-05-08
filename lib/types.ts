export interface GageCache {
  site_no: string;
  site_name: string;
  latitude: number | null;
  longitude: number | null;
  county: string | null;
  huc8: string | null;
  last_gage_height: number | null;
  last_streamflow: number | null;
  last_updated: string | null;
  flood_stage: number | null;
  action_stage: number | null;
  major_flood_stage: number | null;
  moderate_flood_stage: number | null;
  data_source: string;
}

export type FloodStatus =
  | 'major'
  | 'flood'
  | 'action'
  | 'normal'
  | 'percentile_95'
  | 'percentile_90'
  | 'percentile_75'
  | 'percentile_normal'
  | 'no_data';

export interface GageWithStatus extends GageCache {
  status: FloodStatus;
}

export interface Subscription {
  id: string;
  email: string;
  site_no: string;
  site_name: string;
  trigger_level: TriggerLevel;
  enabled: number;
  token: string;
  created_at: string;
  last_alerted_at: string | null;
}

export type TriggerLevel =
  | 'action'
  | 'flood'
  | 'major'
  | 'percentile_90'
  | 'percentile_95';

export interface AlertLog {
  id: string;
  subscription_id: string | null;
  site_no: string;
  trigger_level: string;
  gage_height: number | null;
  streamflow: number | null;
  sent_at: string;
  resend_message_id: string | null;
  email: string | null;
}

export interface SparklinePoint {
  dateTime: string;
  value: number;
}

export interface NIMSImage {
  camId: string;
  camName: string;
  imageUrl: string;
  thumbUrl: string;
  capturedAt: string | null;
}

export interface DroughtSummary {
  mapDate: string;
  none: number;
  d0: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  inDrought: number;
  worstCategory: string;
}

// CloudflareEnv is declared in env.d.ts as global augmentation of CloudflareEnv
export type {};

