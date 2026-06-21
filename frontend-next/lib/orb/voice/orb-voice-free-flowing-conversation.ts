/** Phase 4E — free-flowing ORB Voice conversation helpers. */

import type { OrbVoiceSessionMemory } from './orb-voice-human-conversation.ts'

export const ORB_VOICE_START_CONVERSATION = 'Start conversation' as const
export const ORB_VOICE_LISTENING_LABEL = 'Listening…' as const
export const ORB_VOICE_PAUSE_LABEL = 'Pause' as const
export const ORB_VOICE_PROCESSING_LABEL = 'Processing what you said…' as const
export const ORB_VOICE_THINKING_LABEL = 'ORB is thinking…' as const
export const ORB_VOICE_RESPONDING_LABEL = 'ORB is responding…' as const
export const ORB_VOICE_KATHERINE_UNAVAILABLE =
  'Katherine is unavailable, so ORB is using a fallback voice.' as const
export const ORB_VOICE_KATHERINE_TEXT_ONLY =
  'Katherine is unavailable, so ORB has shown the reply as text.' as const

export const END_OF_TURN_DEBOUNCE_MS = 1_400
export const ORB_VOICE_SLOW_RESPONSE_NOTICE_MS = 3_500

export type OrbVoiceFreeFlowSettings = {
  continuousConversation: boolean
  pushToTalk: boolean
  voiceReplies: boolean
  autoListenAfterReply: boolean
  autoSubmitOnPause: boolean
}

export const ORB_VOICE_FREE_FLOW_DEFAULTS: OrbVoiceFreeFlowSettings = {
  continuousConversation: true,
  pushToTalk: false,
  voiceReplies: true,
  autoListenAfterReply: true,
  autoSubmitOnPause: true
}

export function isOrbVoiceFreeFlowMode(settings: Partial<OrbVoiceFreeFlowSettings>): boolean {
  return Boolean(settings.continuousConversation) && !settings.pushToTalk
}

export function orbVoiceFreeFlowPrimaryLabel(input: {
  listening: boolean
  thinking: boolean
  speaking: boolean
  transcribing: boolean
  pushToTalk: boolean
  continuousConversation: boolean
}): string {
  if (input.speaking) return ORB_VOICE_RESPONDING_LABEL
  if (input.thinking) return ORB_VOICE_THINKING_LABEL
  if (input.transcribing) return ORB_VOICE_PROCESSING_LABEL
  if (input.listening) {
    return input.pushToTalk ? 'Stop and send' : ORB_VOICE_LISTENING_LABEL
  }
  return ORB_VOICE_START_CONVERSATION
}

export function shouldAutoResumeListening(settings: Partial<OrbVoiceFreeFlowSettings>): boolean {
  return (
    isOrbVoiceFreeFlowMode(settings) &&
    settings.autoListenAfterReply !== false &&
    settings.voiceReplies !== false
  )
}

export type OrbVoiceRespondHistoryTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type OrbVoiceRespondRequest = {
  message: string
  mode?: string
  history?: OrbVoiceRespondHistoryTurn[]
  session_memory?: OrbVoiceSessionMemory
}

export type OrbVoiceRespondResult = {
  ok: boolean
  reply: string
  mode?: string
  safetyBoundaryApplied?: boolean
  shouldEscalateToPolicyReminder?: boolean
  prompt_tier?: string
  embeddings_used?: boolean
  retrieval_used?: boolean
}

export function buildOrbVoiceRespondHistory(
  turns: Array<{ role: string; text: string }>
): OrbVoiceRespondHistoryTurn[] {
  return turns
    .filter((turn) => turn.role === 'user' || turn.role === 'assistant')
    .map((turn) => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.text.trim()
    }))
    .filter((turn) => turn.content)
    .slice(-8)
}
