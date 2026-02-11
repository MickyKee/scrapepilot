export type TrendDirection = 'up' | 'down' | 'flat';

export interface StatCard {
  id: string;
  label: string;
  value: string;
  trend_value: number;
  trend_direction: TrendDirection;
  trend_label: string;
}

export interface SummaryResponse {
  cards: StatCard[];
}

export interface TrendingResponse {
  topics: string[];
  points: Array<Record<string, string | number>>;
}

export interface DomainPoint {
  domain: string;
  count: number;
}

export interface ScrapedItem {
  id: number;
  run_id: number;
  title: string;
  url: string;
  points: number;
  comments: number;
  source_domain: string;
  timestamp: string;
}

export interface ItemListResponse {
  total: number;
  items: ScrapedItem[];
}

export interface ScrapeRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: string;
  item_count: number;
  error_message: string | null;
}

export interface HistoryResponse {
  success_rate: number;
  runs: ScrapeRun[];
}

export interface ScrapeStatus {
  is_running: boolean;
  last_run_status: string | null;
  last_run_completed_at: string | null;
  last_error: string | null;
  next_run_at: string | null;
}

export interface Schedule {
  interval_minutes: number;
  next_run_at: string | null;
}
