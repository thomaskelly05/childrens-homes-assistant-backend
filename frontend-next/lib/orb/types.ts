import type { AssistantCitation, AssistantContext, AssistantEvidenceGap, AssistantRegulatoryLink, AssistantRelatedRecord, AssistantSuggestedAction } from '@/lib/assistant-core/types'
import type { OrbToolManifestItem } from './tool-types'

export type OrbBrain =
  | 'care_brain'
  | 'inspector_brain'
  | 'general_assistant_brain'
  | 'web_research_brain'
  | 'productivity_brain'
  | 'report_writer_brain'
  | 'voice_recording_brain'
export type OrbSelectedMode = 'auto' | 'care' | 'inspector' | 'general'
export type OrbState =
  | 'idle'
  | 'connecting'
  | 'passive_listening'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'offline'
  | 'muted'
  | 'unavailable'
  | 'permission_denied'
  | 'expired'
  | 'private'
  | 'recording'
  | 'dictation'
  | 'safeguarding_sensitive'
  | 'inspection'
  | 'error'

export type OrbActivationMode = 'click_tap_orb' | 'push_to_talk' | 'press_to_talk' | 'hey_indicare_placeholder' | 'wake_word_placeholder' | 'keyboard_shortcut'

export type OrbVoiceProfile = {
  profile_id?: string
  name: string
  provider_voice: string
  accent: string
  tone: string
  tone_profile?: string
  product_name?: string
  speed: string
  speaking_speed?: string
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
  voice_style: string
  speaking_speed: string
  response_detail: 'concise' | 'balanced' | 'detailed'
  concise_answers: boolean
  read_citations_aloud: boolean
  show_citations: boolean
  confirm_before_writing_records: boolean
  quiet_mode: boolean
  inspection_challenge_mode: boolean
  safeguarding_sensitive_mode: boolean
  private_mode: boolean
  do_not_store_transcript: boolean
  transcript_retention_days: number | null
  quiet_hours: Record<string, unknown>
  keyboard_shortcut: string
  default_home_id?: number | null
  default_shift_context?: Record<string, unknown>
  captions_enabled?: boolean
  privacy_mode_label?: 'standard' | 'private' | 'do_not_store'
  wake_word_enabled?: boolean
  wake_word_local_only_acknowledged?: boolean
  headset_preference?: 'system_default' | 'speaker' | 'headset' | 'bluetooth'
  microphone_mode?: 'push_to_talk' | 'open_mic'
  interruption_sensitivity?: 'low' | 'medium' | 'high'
  ambient_noise_sensitivity?: 'low' | 'medium' | 'high'
}

export type OrbContext = {
  route?: string | null
  workspace?: string | null
  page_title?: string | null
  selected_young_person_id?: number | null
  selected_young_person_key?: string | null
  selected_record_id?: string | null
  selected_record_type?: string | null
  home_id?: number | null
  home_scope?: Record<string, unknown>
  current_record_summary?: string | null
  current_child?: Record<string, unknown>
  child_context_lock?: Record<string, unknown>
  current_shift?: Record<string, unknown>
  current_task?: Record<string, unknown>
  session_memory?: Record<string, unknown>
  operational_memory?: Record<string, unknown>
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
  requires_external_tool: boolean
  allow_general_knowledge: boolean
  care_scope_required: boolean
  tool_categories: string[]
  memory_updates: Record<string, unknown>
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
  tools_used?: OrbToolManifestItem[]
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
  expires_at?: string | null
  wake_phrase: string
  voice_profile: OrbVoiceProfile
  preferences: OrbPreferences
  mode_decision: OrbModeDecision
  provider_session: Record<string, unknown>
  realtime: Record<string, unknown>
  realtime_state?: Record<string, unknown>
  memory_snapshot?: Record<string, unknown>
  wake_word?: Record<string, unknown>
  operational_event_subscriptions?: Record<string, unknown>
  transcript_storage_policy: Record<string, unknown>
}

export type OrbSessionEventRequest = {
  type:
    | 'session_started'
    | 'user_text'
    | 'partial_transcript'
    | 'speech_started'
    | 'speech_stopped'
    | 'audio_delta'
    | 'response_started'
    | 'response_delta'
    | 'response_done'
    | 'silence_timeout'
    | 'reconnect'
    | 'wake_listening_started'
    | 'wake_listening_stopped'
    | 'wake_word_detected'
    | 'operational_event'
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
  tools_used: OrbToolManifestItem[]
  tool_orchestration?: Record<string, unknown>
  operational_insights: Record<string, unknown>
  realtime_state?: Record<string, unknown>
  memory_snapshot?: Record<string, unknown>
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
  profile_id: 'amelia_british_female_calm',
  name: 'Amelia',
  provider_voice: 'shimmer',
  accent: 'British female, neutral UK with a soft North East warmth where possible',
  tone: 'calm, concise, warm, professional, emotionally steady and human',
  tone_profile: 'british_female_calm_care_companion',
  product_name: 'ORB powered by IndiCare',
  speed: 'medium-slow',
  speaking_speed: 'medium-slow',
  expressiveness: 'natural, reassuring and lightly warm; never theatrical',
  use_case: "children's home operational voice support",
  voice_style: 'british_female_care_companion',
  formality: 'professional but human',
  accessibility_mode: false,
  quiet_mode: false,
  concise_mode: false,
  inspection_mode: false
}

export const defaultOrbPreferences: OrbPreferences = {
  activation_mode: 'click_tap_orb',
  wake_phrase: 'Hey IndiCare',
  voice_style: 'british_female_care_companion',
  speaking_speed: 'medium-slow',
  response_detail: 'concise',
  concise_answers: true,
  read_citations_aloud: false,
  show_citations: true,
  confirm_before_writing_records: true,
  quiet_mode: false,
  inspection_challenge_mode: false,
  safeguarding_sensitive_mode: true,
  private_mode: false,
  do_not_store_transcript: false,
  transcript_retention_days: 30,
  quiet_hours: {},
  keyboard_shortcut: 'Ctrl+Shift+Space',
  default_home_id: null,
  default_shift_context: {},
  captions_enabled: false,
  privacy_mode_label: 'standard',
  wake_word_enabled: false,
  wake_word_local_only_acknowledged: false,
  headset_preference: 'system_default',
  microphone_mode: 'push_to_talk',
  interruption_sensitivity: 'medium',
  ambient_noise_sensitivity: 'medium'
}
