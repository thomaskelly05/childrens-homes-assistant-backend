import type { OrbVoiceV2HandoffPayload, OrbVoiceV2Mode, OrbVoiceV2Turn } from './orb-voice-v2-types.ts'
import {
  ORB_VOICE_V2_ADULT_REVIEW_LABEL,
  ORB_VOICE_V2_SUMMARY_REVIEW_NOTE,
  ORB_VOICE_V2_SUMMARY_TITLE
} from './orb-voice-v2-copy.ts'
import { orbVoiceV2TranscriptMarkdown } from './orb-voice-v2-turns.ts'

export type OrbVoiceV2ReflectionSections = {
  whatWasDiscussed: string
  keyReflections: string
  whatMayNeedRecording: string
  followUpOrOversight: string
  whatHappened?: string
  childVoiceOrPresentation?: string
  adultResponse?: string
}

export type OrbVoiceV2ReflectionPacket = OrbVoiceV2HandoffPayload & {
  summaryMarkdown: string
  sections: OrbVoiceV2ReflectionSections
}

function isIncidentStyleMode(mode: OrbVoiceV2Mode): boolean {
  return (
    mode === 'incident_reflection' ||
    mode === 'safeguarding_thinking' ||
    mode === 'missing_from_home_debrief'
  )
}

function firstAdultThemes(turns: OrbVoiceV2Turn[]): string {
  const adult = turns.filter((t) => t.role === 'adult').map((t) => t.text)
  return adult.slice(0, 3).join(' ') || '—'
}

function orbReflections(turns: OrbVoiceV2Turn[]): string {
  const orb = turns.filter((t) => t.role === 'orb').map((t) => t.text)
  return orb.slice(-2).join(' ') || '—'
}

function recordingHint(mode: OrbVoiceV2Mode, turns: OrbVoiceV2Turn[]): string {
  if (mode === 'safeguarding_thinking' || mode === 'incident_reflection') {
    return 'Consider whether a safeguarding or incident record is needed after review.'
  }
  if (mode === 'missing_from_home_debrief') {
    return 'Consider whether missing-from-home documentation needs updating after review.'
  }
  if (turns.length >= 4) {
    return 'Consider whether any part of this reflection should become a written record.'
  }
  return 'Nothing specific flagged yet — review before saving.'
}

function followUpHint(mode: OrbVoiceV2Mode): string {
  if (mode === 'safeguarding_thinking') {
    return 'Discuss with your manager or safeguarding lead if oversight is needed.'
  }
  if (mode === 'supervision_prep') {
    return 'Take key points into supervision if helpful.'
  }
  return 'Follow up only if something still feels unresolved after review.'
}

export function buildOrbVoiceV2ReflectionPacket(
  turns: OrbVoiceV2Turn[],
  mode: OrbVoiceV2Mode,
  ttsProvider: string | null
): OrbVoiceV2ReflectionPacket {
  const conversationTranscript = orbVoiceV2TranscriptMarkdown(turns)
  const incidentStyle = isIncidentStyleMode(mode)
  const adultThemes = firstAdultThemes(turns)
  const orbFocus = orbReflections(turns)
  const whatMayNeedRecording = recordingHint(mode, turns)
  const followUpOrOversight = followUpHint(mode)

  const sections: OrbVoiceV2ReflectionSections = incidentStyle
    ? {
        whatWasDiscussed: adultThemes,
        keyReflections: orbFocus,
        whatMayNeedRecording,
        followUpOrOversight,
        whatHappened: adultThemes,
        childVoiceOrPresentation: 'Review the conversation for how each young person’s voice or presentation came through.',
        adultResponse: 'Review what adults did at the time and what supported safety.'
      }
    : {
        whatWasDiscussed: adultThemes,
        keyReflections: orbFocus,
        whatMayNeedRecording,
        followUpOrOversight
      }

  const sectionBlocks = incidentStyle
    ? [
        'What happened',
        sections.whatHappened ?? '—',
        '',
        'Child’s voice or presentation',
        sections.childVoiceOrPresentation ?? '—',
        '',
        'Adult response',
        sections.adultResponse ?? '—',
        '',
        'What may need recording',
        whatMayNeedRecording,
        '',
        'Follow-up / oversight',
        followUpOrOversight
      ]
    : [
        'What was discussed',
        sections.whatWasDiscussed,
        '',
        'Key reflections',
        sections.keyReflections,
        '',
        'What may need recording',
        whatMayNeedRecording,
        '',
        'Follow-up / oversight',
        followUpOrOversight
      ]

  const summaryMarkdown = [
    ORB_VOICE_V2_SUMMARY_TITLE,
    ORB_VOICE_V2_ADULT_REVIEW_LABEL,
    ORB_VOICE_V2_SUMMARY_REVIEW_NOTE,
    '',
    `Mode: ${mode.replace(/_/g, ' ')}`,
    '',
    ...sectionBlocks,
    '',
    'Full conversation transcript',
    conversationTranscript || '—'
  ].join('\n')

  return {
    source: 'orb_voice_v2',
    mode,
    conversationTranscript,
    summary: summaryMarkdown,
    summaryMarkdown,
    sections,
    whatMayNeedRecording,
    followUpOrOversight,
    adultReviewStatus: 'generated_for_adult_review',
    audioStored: false,
    ttsProvider,
    selectedVoice: 'katherine',
    createdAt: new Date().toISOString()
  }
}
