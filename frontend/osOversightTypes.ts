export type InspectionReadinessState = 'inspection_ready' | 'monitor' | 'requires_attention' | 'urgent';
export type OversightState = 'stable' | 'monitor' | 'high' | 'critical';

export interface ProviderOversightRow {
  provider_id?: number | null;
  home_id: number;
  open_commands: number;
  critical_commands: number;
  high_commands: number;
  overdue_commands: number;
  safeguarding_pressure: number;
  quality_pressure: number;
  ai_generated_open: number;
  latest_command_at?: string | null;
  oversight_state: OversightState | string;
}

export interface InspectionReadinessRow {
  home_id: number;
  critical_open: number;
  high_open: number;
  overdue_open: number;
  active_missing: number;
  missing_followup_overdue: number;
  reg40_overdue: number;
  reg40_required: number;
  strong_evidence: number;
  evidence_gaps: number;
  children_experiences_progress_open: number;
  helped_and_protected_open: number;
  leadership_management_open: number;
  children_experiences_progress_evidence: number;
  helped_and_protected_evidence: number;
  leadership_management_evidence: number;
  readiness_state: InspectionReadinessState | string;
}

export interface SCCIFEvidenceSummaryRow {
  home_id: number;
  sccif_area: 'children_experiences_progress' | 'helped_and_protected' | 'leadership_management' | string;
  evidence_items: number;
  strong_count: number;
  adequate_count: number;
  weak_count: number;
  gap_count: number;
  latest_evidence_at?: string | null;
}

export interface OversightResponse {
  oversight: ProviderOversightRow[];
  readiness: InspectionReadinessRow[];
  evidence: SCCIFEvidenceSummaryRow[];
}
