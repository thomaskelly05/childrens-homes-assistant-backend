/** Phase 3U — Dictate transcript privacy modes and working transcript resolution. */

export type OrbDictateTranscriptPrivacyMode =
  | 'internal_working'
  | 'redacted_export'
  | 'anonymised_demo'

export const ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE: OrbDictateTranscriptPrivacyMode =
  'internal_working'

export type OrbDictateTranscriptBundle = {
  originalTranscript: string
  redactedTranscript?: string
  workingTranscript: string
  transcriptPrivacyMode: OrbDictateTranscriptPrivacyMode
  redactionApplied?: boolean
  rawTranscriptUnavailable?: boolean
}

export type OrbDictateTranscribePayload = {
  transcript?: string
  working_transcript?: string
  original_transcript?: string
  redacted_transcript?: string | null
  transcript_privacy_mode?: string
  redaction_applied?: boolean
  raw_transcript_unavailable?: boolean
}

function normalizePrivacyMode(value: string | undefined): OrbDictateTranscriptPrivacyMode {
  if (value === 'redacted_export' || value === 'anonymised_demo') return value
  return ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE
}

export function buildTranscriptBundleFromApiPayload(
  data: OrbDictateTranscribePayload,
  mode: OrbDictateTranscriptPrivacyMode = ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE
): OrbDictateTranscriptBundle {
  const original = String(data.original_transcript ?? data.transcript ?? '').trim()
  const redacted = String(data.redacted_transcript ?? '').trim() || undefined
  const fallback = String(data.working_transcript ?? data.transcript ?? '').trim()
  const rawTranscriptUnavailable = Boolean(data.raw_transcript_unavailable) || (!original && Boolean(redacted))

  let workingTranscript = fallback || original || redacted || ''
  const privacyMode = normalizePrivacyMode(data.transcript_privacy_mode) ?? mode

  if (privacyMode === 'internal_working') {
    workingTranscript = original || fallback || redacted || ''
  } else if (privacyMode === 'redacted_export' || privacyMode === 'anonymised_demo') {
    workingTranscript = redacted || fallback || original || ''
  }

  return {
    originalTranscript: original || workingTranscript,
    redactedTranscript: redacted,
    workingTranscript,
    transcriptPrivacyMode: privacyMode,
    redactionApplied: Boolean(data.redaction_applied),
    rawTranscriptUnavailable
  }
}

export function buildTranscriptBundleFromText(
  text: string,
  mode: OrbDictateTranscriptPrivacyMode = ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE
): OrbDictateTranscriptBundle {
  const trimmed = text.trim()
  return {
    originalTranscript: trimmed,
    workingTranscript: trimmed,
    transcriptPrivacyMode: mode,
    redactionApplied: false,
    rawTranscriptUnavailable: false
  }
}

export function resolveWorkingTranscript(bundle: OrbDictateTranscriptBundle): string {
  if (bundle.transcriptPrivacyMode === 'internal_working') {
    return bundle.originalTranscript || bundle.workingTranscript
  }
  return bundle.redactedTranscript || bundle.workingTranscript || bundle.originalTranscript
}

export function workingTranscriptForPrivacyMode(
  bundle: OrbDictateTranscriptBundle,
  mode: OrbDictateTranscriptPrivacyMode = bundle.transcriptPrivacyMode
): string {
  if (mode === 'redacted_export' || mode === 'anonymised_demo') {
    return bundle.redactedTranscript || bundle.workingTranscript
  }
  return bundle.originalTranscript || bundle.workingTranscript
}
