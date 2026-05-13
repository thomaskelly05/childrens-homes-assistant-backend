import type { AssistantCitation, AssistantContext, AssistantEvidenceGap, AssistantRegulatoryLink, AssistantRelatedRecord, AssistantSuggestedAction } from '@/lib/assistant-core/types'

export type OrbBrain = 'care_assistant' | 'inspector'
export type OrbSelectedMode = 'auto' | 'care' | 'inspector'
export type OrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'muted'
  | 'private'
  | 'recording'
  | 'dictation'
  | 'safeguarding_sensitive'
  | 'inspection'
  | 'error'

export type OrbActivationMode = 'press_to_talk' | 'hey_indicare_placeholder' | 'keyboard_shortcut'

export type OrbVoiceProfile = {
  name: string
  provider_voice: string
  accent: string
  tone: string
  speed: string
  expressiveness: string
  use_case: string
  voice_style?: string | null
  formality?: string
  accessibility_mode?: boolean
  quiet_mode?: boolean
  concise_mode?: boolean
  inspection_mode?: boolean
}

export type OrbPreferences = {
  activation_mode: OrbActivationMode
  wake_phrase: string
  concise_answers: boolean
  read_citations_aloud: boolean
  show_citations: boolean
  confirm_before_writing_records: boolean
  safeguarding_sensitive_mode: boolean
  private_mode: boolean
  do_not_store_transcript: boolean
  transcript_retention_days: number | null
  quiet_hours: Record<string, unknown>
  keyboard_shortcut: string
}

export type OrbContext = {
  route?: string | null
  workspace?: string | null
  page_title?: string | null
  selected_young_person_id?: number | null
  selected_record_id?: string | null
  selected_record_type?: string | null
  home_id?: number | null
  home_scope?: Record<string, unknown>
  current_record_summary?: string | null
  assistant_context?: AssistantContext | Record<string, unknown>
}

export type OrbModeDecision = {
  brain: OrbBrain
  assistant_mode: string
  reason: string
  tone: string
  safety_flags: string[]
  requires_citations: boolean
  requires_confirmation_before_write: boolean
  selected_mode: OrbSelectedMode
}

export type OrbVoiceDraft = {
  id: string
  draft_type: string
  title: string
  content: string
  status: 'draft' | 'pending_confirmation' | 'approved' | 'cancelled'
  requires_confirmation: boolean
  source_citations: AssistantCitation[]
  requested_action?: string | null
  approved_by_user_id?: number | null
  approved_at?: string | null
  audit_note: string
}

export type OrbTranscriptEntry = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  state: OrbState
  partial: boolean
  interrupted: boolean
  citations: AssistantCitation[]
  mode_decision?: OrbModeDecision | null
  draft?: OrbVoiceDraft | null
}

export type OrbSessionStartRequest = {
  selected_mode: OrbSelectedMode
  current_state?: OrbState
  context: OrbContext
  voice_profile: OrbVoiceProfile
  preferences: OrbPreferences
  provider?: string | null
  conversation_id?: string | null
  workspace_context?: Record<string, unknown>
}

export type OrbSessionStartData = {
  ok: boolean
  session_id: string
  provider: string
  provider_configured: boolean
  state: OrbState
  wake_phrase: string
  voice_profile: OrbVoiceProfile
  preferences: OrbPreferences
  mode_decision: OrbModeDecision
  provider_session: Record<string, unknown>
  realtime: Record<string, unknown>
  transcript_storage_policy: Record<string, unknown>
}

export type OrbSessionEventRequest = {
  type:
    | 'session_started'
    | 'user_text'
    | 'partial_transcript'
    | 'speech_started'
    | 'speech_stopped'
    | 'assistant_turn'
    | 'interrupt'
    | 'mute'
    | 'unmute'
    | 'privacy_on'
    | 'privacy_off'
    | 'recording_on'
    | 'recording_off'
    | 'dictation_on'
    | 'dictation_off'
    | 'confirmation'
    | 'draft_saved'
    | 'draft_cancelled'
    | 'error'
  text?: string | null
  partial?: boolean
  state?: OrbState | null
  selected_mode?: OrbSelectedMode | null
  context?: OrbContext | null
  metadata?: Record<string, unknown>
}

export type OrbSessionEventData = {
  ok: boolean
  session_id: string
  state: OrbState
  mode_decision: OrbModeDecision
  transcript: OrbTranscriptEntry[]
  assistant_turn?: OrbTranscriptEntry | null
  pending_write_confirmation?: OrbVoiceDraft | null
  citations: AssistantCitation[]
  related_records: AssistantRelatedRecord[]
  suggested_actions: AssistantSuggestedAction[]
  evidence_gaps: AssistantEvidenceGap[]
  regulatory_links: AssistantRegulatoryLink[]
  operational_insights: Record<string, unknown>
  provider_event: Record<string, unknown>
}

export type OrbSessionSummary = {
  session_id: string
  state: OrbState
  mode_decision?: OrbModeDecision | null
  started_at: string
  ended_at?: string | null
  transcript_entries: number
  citations_used: AssistantCitation[]
  records_retrieved: AssistantRelatedRecord[]
  records_changed: Array<Record<string, unknown>>
  pending_drafts: OrbVoiceDraft[]
  privacy: OrbPreferences
}

export type OrbApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export const defaultOrbVoiceProfile: OrbVoiceProfile = {
  name: 'IndiCare British Female',
  provider_voice: 'shimmer',
  accent: 'British',
  tone: 'calm, warm, professional',
  speed: 'medium',
  expressiveness: 'natural but not theatrical',
  use_case: "children's home operational support",
  formality: 'professional',
  accessibility_mode: false,
  quiet_mode: false,
  concise_mode: false,
  inspection_mode: false
}

export const defaultOrbPreferences: OrbPreferences = {
  activation_mode: 'press_to_talk',
  wake_phrase: 'Hey IndiCare',
  concise_answers: true,
  read_citations_aloud: false,
  show_citations: true,
  confirm_before_writing_records: true,
  safeguarding_sensitive_mode: true,
  private_mode: false,
  do_not_store_transcript: false,
  transcript_retention_days: 30,
  quiet_hours: {},
  keyboard_shortcut: 'Ctrl+Shift+Space'
}

