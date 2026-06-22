import type {
  OrbVoiceV2HandoffPayload,
  OrbVoiceV2Intent,
  OrbVoiceV2Mode,
  OrbVoiceV2SessionMemory,
  OrbVoiceV2Turn
} from './orb-voice-v2-types.ts'
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
  youngPeopleInvolved?: string
  observedOrReported?: string
  immediateSafety?: string
  knownFacts?: string
  gapsOrQuestions?: string
}

export type OrbVoiceV2ReflectionPacket = OrbVoiceV2HandoffPayload & {
  summaryMarkdown: string
  sections: OrbVoiceV2ReflectionSections
}

function resolveIntent(
  mode: OrbVoiceV2Mode,
  sessionMemory: OrbVoiceV2SessionMemory | null | undefined,
  explicitIntent: OrbVoiceV2Intent | null | undefined
): OrbVoiceV2Intent | null {
  if (explicitIntent) return explicitIntent
  const fromMemory = sessionMemory?.lastIntent
  if (fromMemory) return fromMemory as OrbVoiceV2Intent
  if (mode === 'incident_reflection') return 'incident_reflection'
  if (mode === 'safeguarding_thinking') return 'safeguarding_thinking'
  if (mode === 'missing_from_home_debrief') return 'missing_from_home'
  if (mode === 'wording_support') return 'recording_wording'
  if (mode === 'supervision_prep') return 'supervision_prep'
  return null
}

function isIncidentStyleMode(mode: OrbVoiceV2Mode, intent: OrbVoiceV2Intent | null): boolean {
  return (
    mode === 'incident_reflection' ||
    mode === 'safeguarding_thinking' ||
    mode === 'missing_from_home_debrief' ||
    intent === 'incident_reflection' ||
    intent === 'missing_from_home'
  )
}

function isBullyingStyle(intent: OrbVoiceV2Intent | null): boolean {
  return intent === 'bullying_or_peer_conflict'
}

function isSafeguardingStyle(mode: OrbVoiceV2Mode, intent: OrbVoiceV2Intent | null): boolean {
  return mode === 'safeguarding_thinking' || intent === 'safeguarding_thinking' || intent === 'allegation_or_complaint'
}

function firstAdultThemes(turns: OrbVoiceV2Turn[]): string {
  const adult = turns.filter((t) => t.role === 'adult').map((t) => t.text)
  return adult.slice(0, 3).join(' ') || '—'
}

function orbReflections(turns: OrbVoiceV2Turn[]): string {
  const orb = turns.filter((t) => t.role === 'orb').map((t) => t.text)
  return orb.slice(-2).join(' ') || '—'
}

function recordingHint(
  mode: OrbVoiceV2Mode,
  turns: OrbVoiceV2Turn[],
  sessionMemory: OrbVoiceV2SessionMemory | null | undefined,
  intent: OrbVoiceV2Intent | null
): string {
  if (sessionMemory?.possibleRecordType) {
    return `Consider whether a ${sessionMemory.possibleRecordType.replace(/_/g, ' ')} is needed after review.`
  }
  if (intent === 'bullying_or_peer_conflict') {
    return 'Consider whether a peer conflict or incident record is needed after review.'
  }
  if (mode === 'safeguarding_thinking' || mode === 'incident_reflection' || intent === 'safeguarding_thinking') {
    return 'Consider whether a safeguarding or incident record is needed after review.'
  }
  if (mode === 'missing_from_home_debrief' || intent === 'missing_from_home') {
    return 'Consider whether missing-from-home documentation needs updating after review.'
  }
  if (turns.length >= 4) {
    return 'Consider whether any part of this reflection should become a written record.'
  }
  return 'Nothing specific flagged yet — review before saving.'
}

function followUpHint(
  mode: OrbVoiceV2Mode,
  sessionMemory: OrbVoiceV2SessionMemory | null | undefined
): string {
  const followUps = sessionMemory?.possibleFollowUp ?? []
  if (followUps.length) {
    return `Review: ${followUps.join('; ')}.`
  }
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
  ttsProvider: string | null,
  options?: {
    sessionMemory?: OrbVoiceV2SessionMemory | null
    intent?: OrbVoiceV2Intent | null
  }
): OrbVoiceV2ReflectionPacket {
  const sessionMemory = options?.sessionMemory ?? null
  const intent = resolveIntent(mode, sessionMemory, options?.intent ?? null)
  const conversationTranscript = orbVoiceV2TranscriptMarkdown(turns)
  const adultThemes = firstAdultThemes(turns)
  const orbFocus = orbReflections(turns)
  const whatMayNeedRecording = recordingHint(mode, turns, sessionMemory, intent)
  const followUpOrOversight = followUpHint(mode, sessionMemory)
  const peopleLine =
    sessionMemory?.keyPeopleMentioned?.join(', ') ||
    'Review the conversation for who was involved.'
  const knownFactsLine =
    sessionMemory?.knownFacts?.length ? sessionMemory.knownFacts.join(' ') : adultThemes
  const gapsLine =
    sessionMemory?.missingInfo?.length
      ? sessionMemory.missingInfo.join('; ')
      : 'Review whether any key details are still unclear.'

  const bullyingStyle = isBullyingStyle(intent)
  const safeguardingStyle = isSafeguardingStyle(mode, intent)
  const incidentStyle = isIncidentStyleMode(mode, intent) && !bullyingStyle

  const sections: OrbVoiceV2ReflectionSections = bullyingStyle
    ? {
        whatWasDiscussed: adultThemes,
        keyReflections: orbFocus,
        whatMayNeedRecording,
        followUpOrOversight,
        youngPeopleInvolved: peopleLine,
        observedOrReported: knownFactsLine,
        adultResponse: 'Review what adults did at the time and what supported safety.'
      }
    : safeguardingStyle
      ? {
          whatWasDiscussed: adultThemes,
          keyReflections: orbFocus,
          whatMayNeedRecording,
          followUpOrOversight,
          immediateSafety: 'Review immediate safety and whether safeguarding procedure was followed.',
          childVoiceOrPresentation:
            'Review the conversation for how the child’s voice or presentation came through.',
          knownFacts: knownFactsLine,
          gapsOrQuestions: gapsLine
        }
      : incidentStyle
        ? {
            whatWasDiscussed: adultThemes,
            keyReflections: orbFocus,
            whatMayNeedRecording,
            followUpOrOversight,
            whatHappened: adultThemes,
            childVoiceOrPresentation:
              'Review the conversation for how each young person’s voice or presentation came through.',
            adultResponse: 'Review what adults did at the time and what supported safety.'
          }
        : {
            whatWasDiscussed: adultThemes,
            keyReflections: orbFocus,
            whatMayNeedRecording,
            followUpOrOversight
          }

  const sectionBlocks = bullyingStyle
    ? [
        'What was discussed',
        sections.whatWasDiscussed,
        '',
        'Young people involved',
        sections.youngPeopleInvolved ?? '—',
        '',
        'What was observed or reported',
        sections.observedOrReported ?? '—',
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
    : safeguardingStyle
      ? [
          'What was discussed',
          sections.whatWasDiscussed,
          '',
          'Immediate safety / procedure considerations',
          sections.immediateSafety ?? '—',
          '',
          'Child’s voice or presentation',
          sections.childVoiceOrPresentation ?? '—',
          '',
          'Known facts',
          sections.knownFacts ?? '—',
          '',
          'Gaps / questions',
          sections.gapsOrQuestions ?? '—',
          '',
          'Follow-up / oversight',
          followUpOrOversight
        ]
      : incidentStyle
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
    intent ? `Intent: ${intent.replace(/_/g, ' ')}` : null,
    '',
    ...sectionBlocks,
    '',
    'Full conversation transcript',
    conversationTranscript || '—'
  ]
    .filter((line) => line !== null)
    .join('\n')

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
    createdAt: new Date().toISOString(),
    intent: intent ?? undefined,
    sessionMemory: sessionMemory ?? undefined
  }
}
