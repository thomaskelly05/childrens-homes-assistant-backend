export type OSCommandPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface OSCommandItem {
  feed_id: string;
  command_item_id?: string | null;
  provider_id?: number | null;
  home_id?: number | null;
  young_person_id?: number | null;
  staff_id?: number | null;
  domain: string;
  priority: OSCommandPriority | string;
  status: string;
  title: string;
  summary?: string | null;
  recommended_action?: string | null;
  source_table?: string | null;
  source_id?: number | null;
  due_at?: string | null;
  sccif_area?: string | null;
  regulation_refs: string[];
  evidence_refs: Array<Record<string, unknown>>;
  ai_generated: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OSCommandSummary {
  provider_id?: number | null;
  home_id?: number | null;
  critical_count: number;
  high_count: number;
  overdue_count: number;
  safeguarding_count: number;
  reg40_count: number;
  risk_count: number;
  quality_count: number;
  open_total: number;
}

export interface OSCommandResponse {
  summary: OSCommandSummary[];
  items: OSCommandItem[];
}
