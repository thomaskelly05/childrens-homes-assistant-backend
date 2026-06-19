/**
 * Phase 1B — single anonymised Guided Demo for ORB Residential web.
 * Composes existing Chat / Dictate / Write / Records stations — no parallel demo product.
 */

import {
  ORB_NAV_DICTATE,
  ORB_NAV_RECORDS,
  ORB_NAV_WRITE,
  ORB_REQUEST_DEMO_LABEL,
  ORB_REQUEST_DEMO_URL,
  ORB_HOME_VALUE_PROPOSITION
} from './orb-user-facing-names.ts'

export const ORB_GUIDED_DEMO_STORAGE_KEY = 'orb-guided-demo-state'
export const ORB_GUIDED_DEMO_SAVE_HINT_KEY = 'orb-guided-demo-save-hint'
export const ORB_GUIDED_DEMO_SAVE_TITLE_PREFIX = '[Anonymised demo]'
export const ORB_GUIDED_DEMO_SAVE_NOTICE =
  'Saved as anonymised demo draft for adult review — not for use in practice without review.'

export const ORB_GUIDED_DEMO_LABEL = 'Guided Demo'
export const ORB_GUIDED_DEMO_ENTRY_SUBLINE =
  'See how ORB helps an adult think through a moment, shape a safer record and keep the child\u2019s experience central.'
export const ORB_GUIDED_DEMO_SAFETY_NOTE =
  'This is an anonymised demo. ORB supports reflection and recording, but adults remain responsible for review, judgement, escalation and following local policy.'

export type OrbGuidedDemoStepId = 'chat' | 'dictate' | 'write' | 'records' | 'request_demo'

export type OrbGuidedDemoStep = {
  id: OrbGuidedDemoStepId
  order: number
  title: string
  explanation: string
  childCentredNote: string
  adultReviewNote: string
  primaryActionLabel: string
}

/** Anonymised residential scenario — no real child identifiers. */
export const ORB_GUIDED_DEMO_SCENARIO = {
  id: 'school-return-withdrawn',
  title: 'After school — withdrawn presentation and tea-time distress',
  summary:
    'A young person returned from school quieter than usual, appeared withdrawn before tea, and later became upset around tea time. Staff offered calm support and space.',
  roughStaffNotes: `School run — young person quiet in the car, minimal chat.
Tea time — low appetite, shoulders hunched, avoided eye contact.
Later — raised voice when asked to clear plate; staff lowered tone, offered space and water.
Settled in lounge after ~15 mins with calm adult nearby.
No injuries. No missing persons. Follow home recording policy.`,
  observedFacts: [
    'Returned from school quieter than usual',
    'Reduced appetite and limited eye contact at tea',
    'Raised voice when asked to clear plate — brief, not prolonged',
    'Settled after calm adult presence and space',
    'No physical injury observed'
  ],
  emotionalPresentation:
    'Withdrawn on return; tearful and frustrated during tea-time exchange; calmer after space and reassurance.',
  staffResponse:
    'Lowered tone, offered water and choice of lounge space, stayed nearby without crowding, avoided blame language.',
  childVoice:
    'When calmer, said school felt "too much today" and did not want to talk straight away.',
  followUpActions: [
    'Note for handover — presentation and what helped',
    'Key-worker check-in next day if presentation continues',
    'Record observable facts for adult review — not assumptions about cause'
  ],
  managerOversightPrompt:
    'Would a manager want to know about the pattern across the week, or is this within expected ups and downs?',
  localPolicyReminder:
    'Follow your home\u2019s recording, notification and escalation policy. ORB does not decide thresholds.'
} as const

export const ORB_GUIDED_DEMO_STEPS: OrbGuidedDemoStep[] = [
  {
    id: 'chat',
    order: 1,
    title: 'Understand the moment in Chat',
    explanation:
      'Start with what staff noticed. ORB helps adults separate facts, presentation and response before writing.',
    childCentredNote: 'Keep the young person\u2019s experience central — not adult frustration or judgement.',
    adultReviewNote: 'Chat suggestions support thinking; an adult must review before any record is used.',
    primaryActionLabel: 'Open Chat with this scenario'
  },
  {
    id: 'dictate',
    order: 2,
    title: `Shape rough notes in ${ORB_NAV_DICTATE}`,
    explanation:
      'Paste or speak rough shift notes. ORB helps structure observable facts, presentation and follow-up.',
    childCentredNote: 'Describe what was seen and heard — not labels about the child\u2019s character.',
    adultReviewNote: `${ORB_NAV_DICTATE} drafts need adult review before they become a home record.`,
    primaryActionLabel: `Open ${ORB_NAV_DICTATE} with demo notes`
  },
  {
    id: 'write',
    order: 3,
    title: `Review and improve in ${ORB_NAV_WRITE}`,
    explanation:
      'Turn structured notes into a clearer daily-record draft with prompts for child voice and follow-up.',
    childCentredNote: 'Include the child\u2019s words where appropriate — without inventing detail.',
    adultReviewNote: `${ORB_NAV_WRITE} supports wording; managers and staff remain responsible for approval.`,
    primaryActionLabel: `Open ${ORB_NAV_WRITE} with demo draft`
  },
  {
    id: 'records',
    order: 4,
    title: `Save to ${ORB_NAV_RECORDS}`,
    explanation:
      'When wording is ready, save a draft for adult review. Demo saves are labelled anonymised demo artefacts.',
    childCentredNote: 'Records are part of a child\u2019s story — written with care, not admin clutter.',
    adultReviewNote: `Nothing from this demo should be used in practice without explicit adult review.`,
    primaryActionLabel: `Open ${ORB_NAV_RECORDS}`
  },
  {
    id: 'request_demo',
    order: 5,
    title: ORB_REQUEST_DEMO_LABEL,
    explanation:
      'Discuss a pilot with IndiCare — see how ORB can support your home\u2019s recording culture without replacing professional judgement.',
    childCentredNote: 'ORB supports adults who keep children central — it does not replace them.',
    adultReviewNote: 'Pilots should include safeguarding leads and recording governance from the start.',
    primaryActionLabel: ORB_REQUEST_DEMO_LABEL
  }
]

export type OrbGuidedDemoState = {
  active: boolean
  stepIndex: number
  startedAt: number
}

export function orbGuidedDemoChatPrompt(): string {
  const s = ORB_GUIDED_DEMO_SCENARIO
  return [
    'Help me understand this situation before I record it for adult review.',
    s.summary,
    'Keep the child central.',
    'What facts, presentation, staff response and follow-up should I separate before writing the daily record?',
    'Do not invent detail. Remind me about local policy and manager oversight where appropriate.'
  ].join(' ')
}

export function orbGuidedDemoDictateNotes(): string {
  const s = ORB_GUIDED_DEMO_SCENARIO
  return [
    s.roughStaffNotes,
    '',
    'Observed facts:',
    ...s.observedFacts.map((f) => `- ${f}`),
    '',
    `Presentation: ${s.emotionalPresentation}`,
    `Staff response: ${s.staffResponse}`,
    `Child voice (when calmer): ${s.childVoice}`,
    '',
    'Follow-up:',
    ...s.followUpActions.map((f) => `- ${f}`),
    '',
    `Manager oversight: ${s.managerOversightPrompt}`,
    `Policy: ${s.localPolicyReminder}`
  ].join('\n')
}

export function orbGuidedDemoWriteSeed(): string {
  const s = ORB_GUIDED_DEMO_SCENARIO
  return [
    '# Daily record draft (anonymised demo — adult review required)',
    '',
    '## Summary',
    s.summary,
    '',
    '## What was observed',
    ...s.observedFacts.map((f) => `- ${f}`),
    '',
    '## Emotional presentation',
    s.emotionalPresentation,
    '',
    '## Staff response',
    s.staffResponse,
    '',
    '## Child voice',
    s.childVoice,
    '',
    '## Follow-up',
    ...s.followUpActions.map((f) => `- ${f}`),
    '',
    '## Manager oversight',
    s.managerOversightPrompt,
    '',
    '## Policy reminder',
    s.localPolicyReminder
  ].join('\n')
}

export function defaultOrbGuidedDemoState(): OrbGuidedDemoState {
  return { active: false, stepIndex: 0, startedAt: 0 }
}

export function readOrbGuidedDemoState(): OrbGuidedDemoState {
  if (typeof window === 'undefined') return defaultOrbGuidedDemoState()
  try {
    const raw = window.sessionStorage.getItem(ORB_GUIDED_DEMO_STORAGE_KEY)
    if (!raw) return defaultOrbGuidedDemoState()
    const parsed = JSON.parse(raw) as Partial<OrbGuidedDemoState>
    if (!parsed || typeof parsed !== 'object') return defaultOrbGuidedDemoState()
    return {
      active: Boolean(parsed.active),
      stepIndex: Math.min(
        Math.max(0, Number(parsed.stepIndex) || 0),
        ORB_GUIDED_DEMO_STEPS.length - 1
      ),
      startedAt: Number(parsed.startedAt) || Date.now()
    }
  } catch {
    return defaultOrbGuidedDemoState()
  }
}

export function writeOrbGuidedDemoState(state: OrbGuidedDemoState): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(ORB_GUIDED_DEMO_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

export function startOrbGuidedDemo(): OrbGuidedDemoState {
  const state: OrbGuidedDemoState = { active: true, stepIndex: 0, startedAt: Date.now() }
  writeOrbGuidedDemoState(state)
  return state
}

export function advanceOrbGuidedDemoStep(state: OrbGuidedDemoState): OrbGuidedDemoState {
  const next: OrbGuidedDemoState = {
    ...state,
    stepIndex: Math.min(state.stepIndex + 1, ORB_GUIDED_DEMO_STEPS.length - 1)
  }
  writeOrbGuidedDemoState(next)
  return next
}

export function clearOrbGuidedDemoState(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(ORB_GUIDED_DEMO_STORAGE_KEY)
    window.sessionStorage.removeItem(ORB_GUIDED_DEMO_SAVE_HINT_KEY)
  } catch {
    /* ignore */
  }
}

export function markOrbGuidedDemoSaveHint(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(ORB_GUIDED_DEMO_SAVE_HINT_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isOrbGuidedDemoSaveHintActive(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(ORB_GUIDED_DEMO_SAVE_HINT_KEY) === '1'
  } catch {
    return false
  }
}

export function orbGuidedDemoSaveTitle(baseTitle: string): string {
  const trimmed = baseTitle.trim()
  if (trimmed.startsWith(ORB_GUIDED_DEMO_SAVE_TITLE_PREFIX)) return trimmed
  return `${ORB_GUIDED_DEMO_SAVE_TITLE_PREFIX} ${trimmed}`
}

export function resolveOrbGuidedDemoSaveTitle(baseTitle: string): string {
  if (!isOrbGuidedDemoSaveHintActive()) return baseTitle
  return orbGuidedDemoSaveTitle(baseTitle)
}

export function orbGuidedDemoSaveStatusMessage(defaultMessage: string): string {
  if (!isOrbGuidedDemoSaveHintActive()) return defaultMessage
  return ORB_GUIDED_DEMO_SAVE_NOTICE
}

export function orbGuidedDemoStepByIndex(index: number): OrbGuidedDemoStep {
  return ORB_GUIDED_DEMO_STEPS[Math.min(Math.max(0, index), ORB_GUIDED_DEMO_STEPS.length - 1)]
}

export { ORB_HOME_VALUE_PROPOSITION, ORB_REQUEST_DEMO_LABEL, ORB_REQUEST_DEMO_URL }
