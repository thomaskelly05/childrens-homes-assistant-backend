import type { OrbVoiceV2HandoffPayload, OrbVoiceV2Mode, OrbVoiceV2Turn } from './orb-voice-v2-types.ts'
import { buildOrbVoiceV2ReflectionPacket } from './orb-voice-v2-reflection.ts'

export { buildOrbVoiceV2ReflectionPacket } from './orb-voice-v2-reflection.ts'
export type { OrbVoiceV2ReflectionPacket, OrbVoiceV2ReflectionSections } from './orb-voice-v2-reflection.ts'

export function buildOrbVoiceV2Summary(turns: OrbVoiceV2Turn[], mode: OrbVoiceV2Mode): string {
  return buildOrbVoiceV2ReflectionPacket(turns, mode, null).summaryMarkdown
}

export function buildOrbVoiceV2Handoff(
  turns: OrbVoiceV2Turn[],
  mode: OrbVoiceV2Mode,
  summary: string,
  ttsProvider: string | null
): OrbVoiceV2HandoffPayload {
  const packet = buildOrbVoiceV2ReflectionPacket(turns, mode, ttsProvider)
  return {
    source: packet.source,
    mode: packet.mode,
    conversationTranscript: packet.conversationTranscript,
    summary: summary || packet.summaryMarkdown,
    summaryMarkdown: packet.summaryMarkdown,
    whatMayNeedRecording: packet.whatMayNeedRecording,
    followUpOrOversight: packet.followUpOrOversight,
    audioStored: false,
    selectedVoice: packet.selectedVoice,
    ttsProvider: packet.ttsProvider,
    adultReviewStatus: packet.adultReviewStatus,
    createdAt: packet.createdAt
  }
}
