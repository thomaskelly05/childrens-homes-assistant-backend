/**
 * Meeting minutes LLM quality evaluation harness.
 * Deterministic checks over fixtures and mock outputs — live LLM eval is staging/manual.
 */

import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from './orb-dictate-speaker.ts'
import { buildSpeakersFromSegments } from './orb-dictate-speaker-model.ts'
import { formatSegmentSourceRef } from './orb-dictate-source-check.ts'

export type MeetingMinutesFixture = {
  id: string
  label: string
  noteType: string
  transcriptTurns: OrbDictateTranscriptSegment[]
  confirmedParticipants: OrbDictateParticipant[]
  expectedSummaryThemes: string[]
  expectedActionPoints: string[]
  expectedMissingInformation: string[]
  expectedSafeguardingPrompts: string[]
  expectedManagementOversight: boolean
  prohibitedPatterns: RegExp[]
}

const PROHIBITED_UNIVERSAL: RegExp[] = [
  /\bdiagnos(is|ed|e)\b/i,
  /\b(manipulative|attention[\s-]?seeking|naughty|bad behaviour)\b/i,
  /\b(HIPAA|government[\s-]?grade)\b/i,
  /\binvented\b/i
]

function seg(
  id: string,
  speaker: string,
  text: string,
  source: OrbDictateTranscriptSegment['source'] = 'paste'
): OrbDictateTranscriptSegment {
  return { id, speaker_label: speaker, text, source }
}

export const ORB_MEETING_MINUTES_FIXTURES: MeetingMinutesFixture[] = [
  {
    id: 'staff_handover',
    label: 'Staff handover meeting',
    noteType: 'handover_note',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'Night shift quiet. Jay did not sleep until 2am.'),
      seg('s2', 'Speaker 2', 'Medication given at 8. Contact with mum declined.'),
      seg('s1', 'Speaker 1', 'Action: hand over risk note to day manager.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'Alex', role: 'Night staff', introducedBy: 'manual' },
      { id: 'p2', name: 'Sam', role: 'Day staff', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['sleep', 'medication', 'contact', 'risk'],
    expectedActionPoints: ['hand over risk note', 'day manager'],
    expectedMissingInformation: ['follow-up', 'child voice'],
    expectedSafeguardingPrompts: [],
    expectedManagementOversight: true,
    prohibitedPatterns: [...PROHIBITED_UNIVERSAL, /\bchose to behave\b/i]
  },
  {
    id: 'supervision_discussion',
    label: 'Supervision discussion',
    noteType: 'supervision_discussion',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'We discussed caseload stress after the incident last week.'),
      seg('s2', 'Speaker 2', 'Worker reflected on de-escalation timing.'),
      seg('s1', 'Speaker 1', 'Agreed supervision actions: shadowing session Friday.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'Jordan', role: 'Supervisor', introducedBy: 'manual' },
      { id: 'p2', name: 'Casey', role: 'Support worker', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['supervision', 'reflection', 'support'],
    expectedActionPoints: ['shadowing', 'Friday'],
    expectedMissingInformation: ['specific child', 'not stated'],
    expectedSafeguardingPrompts: [],
    expectedManagementOversight: false,
    prohibitedPatterns: PROHIBITED_UNIVERSAL
  },
  {
    id: 'multi_agency',
    label: 'Multi-agency discussion',
    noteType: 'multi_agency_discussion',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'Social worker joined by phone. Education report overdue.'),
      seg('s2', 'Speaker 2', 'School attendance discussed. No new injuries reported.'),
      seg('s3', 'Speaker 3', 'Actions: chase education report by Wednesday.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'RM', role: 'Registered Manager', introducedBy: 'manual' },
      { id: 'p2', name: 'SW', role: 'Social worker', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['education', 'attendance', 'agencies'],
    expectedActionPoints: ['education report', 'Wednesday'],
    expectedMissingInformation: ['child voice', 'young person'],
    expectedSafeguardingPrompts: ['injuries'],
    expectedManagementOversight: true,
    prohibitedPatterns: PROHIBITED_UNIVERSAL
  },
  {
    id: 'home_visit',
    label: 'Home visit discussion',
    noteType: 'home_visit_note',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'Visit to family home. Living conditions acceptable.'),
      seg('s2', 'Speaker 2', 'Young person said they want more contact with sibling.'),
      seg('s1', 'Speaker 1', 'Follow-up: record wishes in placement plan review.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'Worker', role: 'Key worker', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['visit', 'contact', 'wishes'],
    expectedActionPoints: ['placement plan', 'review'],
    expectedMissingInformation: ['who attended', 'time'],
    expectedSafeguardingPrompts: [],
    expectedManagementOversight: false,
    prohibitedPatterns: PROHIBITED_UNIVERSAL
  },
  {
    id: 'strategy_safeguarding',
    label: 'Strategy / safeguarding discussion',
    noteType: 'strategy_safeguarding_discussion',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'Strategy meeting re unexplained bruising.'),
      seg('s2', 'Speaker 2', 'Immediate safety plan reviewed. DSL notified.'),
      seg('s1', 'Speaker 1', 'Action: secure chronology for next strategy review Monday.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'DSL', role: 'Designated safeguarding lead', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['safeguarding', 'safety', 'bruising'],
    expectedActionPoints: ['chronology', 'Monday'],
    expectedMissingInformation: ['medical', 'not clear'],
    expectedSafeguardingPrompts: ['safety', 'DSL', 'escalat'],
    expectedManagementOversight: true,
    prohibitedPatterns: [...PROHIBITED_UNIVERSAL, /\bconfirmed abuse\b/i]
  },
  {
    id: 'incident_debrief',
    label: 'Incident debrief',
    noteType: 'staff_debrief',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'Debrief after lounge incident. Cushion thrown, no injury.'),
      seg('s2', 'Speaker 2', 'Staff used calm voice and offered space.'),
      seg('s1', 'Speaker 1', 'Learning: review sensory triggers before evening contact.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'Team', role: 'Staff member', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['incident', 'de-escalation', 'learning'],
    expectedActionPoints: ['sensory', 'review'],
    expectedMissingInformation: ['child voice', 'time'],
    expectedSafeguardingPrompts: ['injury'],
    expectedManagementOversight: true,
    prohibitedPatterns: [...PROHIBITED_UNIVERSAL, /\bkicked off\b/i]
  },
  {
    id: 'young_person_consultation',
    label: 'Young person consultation',
    noteType: 'professional_consultation',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'Young person said school feels overwhelming.'),
      seg('s2', 'Speaker 2', 'They asked for quieter breakfast routine.'),
      seg('s1', 'Speaker 1', 'Agreed to discuss with school next week.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'YP', role: 'Young person', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['voice', 'school', 'wishes'],
    expectedActionPoints: ['school', 'next week'],
    expectedMissingInformation: ['who will contact', 'not stated'],
    expectedSafeguardingPrompts: [],
    expectedManagementOversight: false,
    prohibitedPatterns: [...PROHIBITED_UNIVERSAL, /\bfailed to engage\b/i]
  },
  {
    id: 'assessment_notes',
    label: 'Assessment notes meeting',
    noteType: 'assessment_notes',
    transcriptTurns: [
      seg('s1', 'Speaker 1', 'Assessment planning for new admission.'),
      seg('s2', 'Speaker 2', 'Background history incomplete — request files from placing authority.'),
      seg('s1', 'Speaker 1', 'Risk assessment draft due before panel Thursday.')
    ],
    confirmedParticipants: [
      { id: 'p1', name: 'Manager', role: 'Registered Manager', introducedBy: 'manual' }
    ],
    expectedSummaryThemes: ['assessment', 'admission', 'risk'],
    expectedActionPoints: ['files', 'placing authority', 'Thursday'],
    expectedMissingInformation: ['history', 'incomplete'],
    expectedSafeguardingPrompts: ['risk'],
    expectedManagementOversight: true,
    prohibitedPatterns: PROHIBITED_UNIVERSAL
  }
]

export type MeetingMinutesEvalResult = {
  fixtureId: string
  passed: boolean
  failures: string[]
}

export function buildMeetingMinutesPromptScaffold(fixture: MeetingMinutesFixture): string {
  const speakers = buildSpeakersFromSegments(fixture.transcriptTurns, fixture.confirmedParticipants)
  const speakerBlock = speakers.map((s) => `- ${s.displayLabel}${s.isConfirmed ? ' [confirmed]' : ''}`).join('\n')
  const turns = fixture.transcriptTurns
    .map((t) => `${t.speaker_label}: ${t.text}`)
    .join('\n')
  return [
    `Note type: ${fixture.noteType}`,
    'Participants:',
    speakerBlock,
    'Transcript by speaker:',
    turns,
    'Requirements: child-centred, factual, non-judgemental, adult review required.'
  ].join('\n')
}

export function evaluateMeetingMinutesOutput(
  fixture: MeetingMinutesFixture,
  output: {
    summary?: string
    professionalNote?: string
    actions?: string[]
    missingInformation?: string[]
    safeguardingPrompts?: string[]
  }
): MeetingMinutesEvalResult {
  const failures: string[] = []
  const combined = [output.summary, output.professionalNote, ...(output.actions ?? [])]
    .filter(Boolean)
    .join('\n')

  for (const pattern of fixture.prohibitedPatterns) {
    if (pattern.test(combined)) {
      failures.push(`Prohibited pattern matched: ${pattern}`)
    }
  }

  for (const theme of fixture.expectedSummaryThemes) {
    if (!combined.toLowerCase().includes(theme.toLowerCase())) {
      failures.push(`Missing expected summary theme: ${theme}`)
    }
  }

  const actionsText = (output.actions ?? []).join(' ').toLowerCase()
  for (const action of fixture.expectedActionPoints) {
    if (!actionsText.includes(action.toLowerCase()) && !combined.toLowerCase().includes(action.toLowerCase())) {
      failures.push(`Missing expected action point theme: ${action}`)
    }
  }

  if (fixture.expectedManagementOversight && !/\b(manager|oversight|reviewed|registered manager|DSL)\b/i.test(combined)) {
    failures.push('Expected management oversight language')
  }

  const speakers = buildSpeakersFromSegments(fixture.transcriptTurns, fixture.confirmedParticipants)
  const unconfirmed = speakers.filter((s) => !s.isConfirmed && /^Speaker \d+$/i.test(s.displayLabel))
  if (unconfirmed.length && /\b(Alex|Sam|Jordan|Casey)\b/.test(combined) && !fixture.confirmedParticipants.length) {
    failures.push('Invented names without confirmation')
  }

  return { fixtureId: fixture.id, passed: failures.length === 0, failures }
}

export function evaluateSourceReferences(segments: OrbDictateTranscriptSegment[]): string[] {
  const issues: string[] = []
  for (const seg of segments) {
    const ref = formatSegmentSourceRef(seg)
    if (/\d{2}:\d{2}–\d{2}:\d{2}/.test(ref) && !seg.started_at && !seg.ended_at) {
      issues.push(`Fabricated timestamp in source ref for ${seg.id}`)
    }
    if (ref.includes('transcript turn') || seg.started_at) {
      continue
    }
    issues.push(`Weak source ref for ${seg.id}`)
  }
  return issues
}

/** Mock "good" output for deterministic harness tests — not live LLM. */
export function mockMeetingMinutesOutput(fixture: MeetingMinutesFixture): {
  summary: string
  professionalNote: string
  actions: string[]
} {
  const themes = fixture.expectedSummaryThemes.join(', ')
  const actions = fixture.expectedActionPoints.map((a) => `Action: ${a} — owner Not stated — deadline Not stated`)
  return {
    summary: `Meeting summary covering ${themes}. Child voice and management oversight noted where relevant. Adult review required.`,
    professionalNote: `Professional record for ${fixture.label}. Themes: ${themes}. Manager oversight documented. Non-judgemental factual tone.`,
    actions
  }
}

export const LIVE_LLM_EVAL_REQUIREMENT =
  'Live LLM meeting-minutes evaluation requires staging with OPENAI_API_KEY — run manually against fixtures.'
