import type { DictateState } from '@/lib/orb/dictate/orb-dictate-state'

export type DictateRecordingUiState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'processing'
  | 'stopped'
  | 'error'

export type DictateMobileAiActionId =
  | 'improve_wording'
  | 'make_professional'
  | 'daily_record'
  | 'incident_note'
  | 'reflective_note'
  | 'safeguarding_lens'
  | 'ofsted_lens'

export const ORB_DICTATE_MOBILE_AI_ACTIONS: ReadonlyArray<{
  id: DictateMobileAiActionId
  label: string
}> = [
  { id: 'improve_wording', label: 'Improve wording' },
  { id: 'make_professional', label: 'Make professional' },
  { id: 'daily_record', label: 'Daily record' },
  { id: 'incident_note', label: 'Incident note' },
  { id: 'reflective_note', label: 'Reflective note' },
  { id: 'safeguarding_lens', label: 'Safeguarding lens' },
  { id: 'ofsted_lens', label: 'Ofsted lens' }
]

export function dictateMobilePrimaryButton(input: {
  dictateState: DictateState
  recordingUiState: DictateRecordingUiState
  hasTranscript: boolean
}): string {
  if (input.dictateState === 'error' || input.recordingUiState === 'error') return 'Try again'
  if (
    input.recordingUiState === 'recording' ||
    input.dictateState === 'listening' ||
    input.dictateState === 'requesting_permission' ||
    input.dictateState === 'stopping'
  ) {
    return 'Stop recording'
  }
  if (input.hasTranscript && (input.dictateState === 'transcript_ready' || input.recordingUiState === 'stopped')) {
    return 'Record more'
  }
  return 'Start recording'
}

export function dictateMobileStatusLine(input: {
  dictateState: DictateState
  recordingUiState: DictateRecordingUiState
  hasTranscript: boolean
  speechError: string | null
  userStatus: string | null
  listening: boolean
}): string {
  if (input.speechError) return input.speechError
  if (input.dictateState === 'error' || input.recordingUiState === 'error') {
    return input.userStatus?.trim() || 'Recording could not start. Try again or paste a transcript.'
  }
  if (input.listening || input.dictateState === 'listening') return 'Listening…'
  if (input.dictateState === 'stopping' || input.recordingUiState === 'stopping') return 'Finishing…'
  if (input.dictateState === 'generating') return 'Generating…'
  if (input.hasTranscript && input.dictateState === 'transcript_ready') return 'Transcript captured'
  if (input.userStatus && !isTechnicalDictateStatus(input.userStatus)) return input.userStatus
  return 'Ready to capture'
}

export function isTechnicalDictateStatus(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('server realtime') ||
    lower.includes('start speech transcript') ||
    lower.includes('speech transcript captured') ||
    lower.includes('realtime_transcription')
  )
}

export function dictateMobileShowsCapturedCard(input: {
  hasTranscript: boolean
  dictateState: DictateState
}): boolean {
  return input.hasTranscript && input.dictateState !== 'error'
}
