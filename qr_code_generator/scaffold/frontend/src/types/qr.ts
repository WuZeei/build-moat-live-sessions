export interface CreateRequest {
  url: string;
  expires_at?: string | null;
}

export interface CreateResponse {
  token: string;
  short_url: string;
  qr_code_url: string;
  original_url: string;
}

export interface QRInfo {
  token: string;
  original_url: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_deleted: boolean;
}

export interface UpdateRequest {
  url?: string | null;
  expires_at?: string | null;
}

export interface AnalyticsDayCount {
  date: string;
  count: number;
}

export interface AnalyticsResponse {
  token: string;
  total_scans: number;
  scans_by_day: AnalyticsDayCount[];
}
