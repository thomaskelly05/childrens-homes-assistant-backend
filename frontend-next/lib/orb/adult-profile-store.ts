'use client'

import type { ResidentialAgentId } from '@/lib/orb/residential-agents'

/** Canonical roles for standalone ORB personalisation (legacy keys migrated on read). */
export type AdultProfileRole =
  | 'residential_support_worker'
  | 'senior_support_worker'
  | 'deputy_manager'
  | 'registered_manager'
  | 'responsible_individual'
  | 'provider_director'
  | 'reg_44_visitor'
  | 'social_worker'
  | 'nvq_assessor'
  | 'nvq_learner'
  | 'diploma_learner'
  | 'trainer_consultant'
  | 'other'
  | 'practitioner'
  | 'senior_practitioner'
  | 'team_leader'
  | 'night_staff'
  | 'agency_staff'
  | 'provider_rep'

export type AdultProfileTone = 'calm' | 'direct' | 'reflective' | 'coaching'
export type SafeguardingIntensity = 'standard' | 'heightened' | 'maximum'
export type WritingStyle = 'concise' | 'structured' | 'narrative'
export type ReasoningDepth = 'concise' | 'balanced' | 'deep'
export type PreferredAnswerLength = 'brief' | 'balanced' | 'detailed'
export type ConfidencePreference = 'cautious' | 'balanced' | 'direct'

export type AdultProfileLensDefaults = {
  ofsted: boolean
  safeguarding: boolean
  recording: boolean
}

export type AdultProfile = {
  id: string
  name: string
  role: AdultProfileRole
  roleLabel: string
  homeName: string
  serviceType?: string
  team?: string
  shiftRole?: string
  permissions: string[]
  preferredAgent: ResidentialAgentId
  preferredTone: AdultProfileTone
  preferredAnswerLength: PreferredAnswerLength
  confidencePreference: ConfidencePreference
  safeguardingIntensity: SafeguardingIntensity
  writingStyle: WritingStyle
  therapeuticPreferences: string
  accessibilityNotes: string
  preferredTerminology?: string
  defaultLenses: AdultProfileLensDefaults
  notificationPreferences: {
    safeguardingReminders: boolean
    supervisionPrep: boolean
  }
  supervisionPreferences: {
    reflectiveDepth: 'light' | 'standard' | 'deep'
    includeEvidenceGaps: boolean
  }
  cognitionPreferences: {
    reasoningDepth: ReasoningDepth
    chronologyAwareness: boolean
    showExplainabilityByDefault: boolean
    institutionalDepth: boolean
  }
  voicePreference?: {
    prefersSpokenResponses: boolean
    britishFemale: boolean
  }
  customInstructions?: string
  roleContextNotes?: string
  supervisionGoals?: string
  currentFocusAreas?: string
  updatedAt: number
}

export const ADULT_PROFILE_STORAGE_KEY = 'orb-adult-profile-v1'

export const STANDALONE_PROFILE_BOUNDARY_NOTE =
  'Standalone ORB uses only your profile, projects, and what you type. It does not access live IndiCare OS child, home, staff, or care records.'

const LEGACY_ROLE_MIGRATION: Partial<Record<AdultProfileRole, AdultProfileRole>> = {
  practitioner: 'residential_support_worker',
  senior_practitioner: 'senior_support_worker',
  team_leader: 'senior_support_worker',
  night_staff: 'residential_support_worker',
  agency_staff: 'residential_support_worker',
  provider_rep: 'provider_director'
}

export const CANONICAL_ADULT_PROFILE_ROLES: AdultProfileRole[] = [
  'residential_support_worker',
  'senior_support_worker',
  'deputy_manager',
  'registered_manager',
  'responsible_individual',
  'provider_director',
  'reg_44_visitor',
  'social_worker',
  'nvq_assessor',
  'nvq_learner',
  'diploma_learner',
  'trainer_consultant',
  'other'
]

export const DEFAULT_ADULT_PROFILE: AdultProfile = {
  id: 'adult-default',
  name: '',
  role: 'residential_support_worker',
  roleLabel: 'Residential support worker',
  homeName: '',
  serviceType: "Children's residential home",
  permissions: ['guidance', 'reflection', 'recording_support'],
  preferredAgent: 'ask_orb',
  preferredTone: 'calm',
  preferredAnswerLength: 'balanced',
  confidencePreference: 'balanced',
  safeguardingIntensity: 'standard',
  writingStyle: 'structured',
  therapeuticPreferences: 'Trauma-informed, child-centred, repair-focused',
  accessibilityNotes: '',
  preferredTerminology: '',
  defaultLenses: {
    ofsted: false,
    safeguarding: true,
    recording: true
  },
  notificationPreferences: {
    safeguardingReminders: true,
    supervisionPrep: true
  },
  supervisionPreferences: {
    reflectiveDepth: 'standard',
    includeEvidenceGaps: true
  },
  cognitionPreferences: {
    reasoningDepth: 'balanced',
    chronologyAwareness: true,
    showExplainabilityByDefault: false,
    institutionalDepth: true
  },
  voicePreference: {
    prefersSpokenResponses: false,
    britishFemale: true
  },
  customInstructions: '',
  roleContextNotes: '',
  supervisionGoals: '',
  currentFocusAreas: '',
  updatedAt: 0
}

export function normalizeAdultProfileRole(role: AdultProfileRole): AdultProfileRole {
  return LEGACY_ROLE_MIGRATION[role] ?? role
}

export function roleLabelFor(role: AdultProfileRole): string {
  const normalized = normalizeAdultProfileRole(role)
  const labels: Record<AdultProfileRole, string> = {
    residential_support_worker: 'Residential support worker',
    senior_support_worker: 'Senior support worker',
    deputy_manager: 'Deputy manager',
    registered_manager: 'Registered manager',
    responsible_individual: 'Responsible Individual',
    provider_director: 'Provider / director',
    reg_44_visitor: 'Reg 44 visitor',
    social_worker: 'Social worker',
    nvq_assessor: 'NVQ assessor',
    nvq_learner: 'NVQ learner',
    diploma_learner: 'Diploma learner',
    trainer_consultant: 'Trainer / consultant',
    other: 'Other',
    practitioner: 'Residential support worker',
    senior_practitioner: 'Senior support worker',
    team_leader: 'Senior support worker',
    night_staff: 'Residential support worker',
    agency_staff: 'Residential support worker',
    provider_rep: 'Provider / director'
  }
  return labels[normalized] ?? labels[role] ?? 'Other'
}

function mergeProfile(parsed: Partial<AdultProfile>): AdultProfile {
  const role = normalizeAdultProfileRole((parsed.role ?? DEFAULT_ADULT_PROFILE.role) as AdultProfileRole)
  return {
    ...DEFAULT_ADULT_PROFILE,
    ...parsed,
    role,
    roleLabel: parsed.roleLabel || roleLabelFor(role),
    defaultLenses: {
      ...DEFAULT_ADULT_PROFILE.defaultLenses,
      ...parsed.defaultLenses
    },
    preferredAnswerLength: parsed.preferredAnswerLength ?? DEFAULT_ADULT_PROFILE.preferredAnswerLength,
    confidencePreference: parsed.confidencePreference ?? DEFAULT_ADULT_PROFILE.confidencePreference,
    serviceType: parsed.serviceType ?? DEFAULT_ADULT_PROFILE.serviceType,
    preferredTerminology: parsed.preferredTerminology ?? DEFAULT_ADULT_PROFILE.preferredTerminology,
    notificationPreferences: {
      ...DEFAULT_ADULT_PROFILE.notificationPreferences,
      ...parsed.notificationPreferences
    },
    supervisionPreferences: {
      ...DEFAULT_ADULT_PROFILE.supervisionPreferences,
      ...parsed.supervisionPreferences
    },
    cognitionPreferences: {
      ...DEFAULT_ADULT_PROFILE.cognitionPreferences,
      ...parsed.cognitionPreferences
    },
    voicePreference: {
      ...DEFAULT_ADULT_PROFILE.voicePreference!,
      ...parsed.voicePreference
    },
    customInstructions: parsed.customInstructions ?? DEFAULT_ADULT_PROFILE.customInstructions,
    roleContextNotes: parsed.roleContextNotes ?? DEFAULT_ADULT_PROFILE.roleContextNotes,
    supervisionGoals: parsed.supervisionGoals ?? DEFAULT_ADULT_PROFILE.supervisionGoals,
    currentFocusAreas: parsed.currentFocusAreas ?? DEFAULT_ADULT_PROFILE.currentFocusAreas,
    updatedAt: parsed.updatedAt ?? Date.now()
  }
}

export function readAdultProfile(): AdultProfile {
  if (typeof window === 'undefined') return { ...DEFAULT_ADULT_PROFILE, updatedAt: Date.now() }
  try {
    const raw = window.localStorage.getItem(ADULT_PROFILE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ADULT_PROFILE, updatedAt: Date.now() }
    const parsed = JSON.parse(raw) as Partial<AdultProfile>
    return mergeProfile(parsed)
  } catch {
    return { ...DEFAULT_ADULT_PROFILE, updatedAt: Date.now() }
  }
}

export function writeAdultProfile(profile: AdultProfile): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    ADULT_PROFILE_STORAGE_KEY,
    JSON.stringify({ ...profile, updatedAt: Date.now() })
  )
}

export function roleResponseGuidance(profile: AdultProfile): string | null {
  const role = normalizeAdultProfileRole(profile.role)
  if (role === 'registered_manager' || role === 'responsible_individual' || role === 'provider_director') {
    return 'Lean toward oversight, evidence, actions, staff learning, Ofsted readiness, manager grip, and decision rationale.'
  }
  if (role === 'deputy_manager') {
    return 'Lean toward RM cover, oversight, risk, staff learning, and recording standards.'
  }
  if (role === 'reg_44_visitor') {
    return 'Lean toward independent scrutiny, triangulation, child voice, evidence sufficiency, and questions to ask next.'
  }
  if (role === 'nvq_assessor') {
    return 'Lean toward evidence mapping, professional discussion, criteria gaps, assessor feedback, and learner authenticity — never fabricate evidence.'
  }
  if (role === 'nvq_learner' || role === 'diploma_learner') {
    return 'Lean toward plain-English criteria, reflective account structure, evidence suggestions, and authenticity — based only on what the learner describes.'
  }
  if (role === 'trainer_consultant') {
    return 'Lean toward training design, briefing, facilitation questions, and policy-to-learning links.'
  }
  if (
    role === 'residential_support_worker' ||
    role === 'senior_support_worker' ||
    role === 'night_staff' ||
    role === 'agency_staff' ||
    role === 'practitioner'
  ) {
    return 'Lean toward what to do now, what to record, when to escalate, child-centred wording, immediate safety, and therapeutic response.'
  }
  return null
}

export function buildAdultProfilePromptBlock(profile: AdultProfile): string {
  const roleGuidance = roleResponseGuidance(profile)
  const answerLength =
    profile.preferredAnswerLength === 'brief'
      ? 'Keep answers concise unless safety requires detail.'
      : profile.preferredAnswerLength === 'detailed'
        ? 'Provide fuller structured detail where helpful.'
        : 'Balance clarity and depth.'

  const confidenceLine =
    profile.confidencePreference === 'cautious'
      ? 'State uncertainty clearly; avoid overclaiming.'
      : profile.confidencePreference === 'direct'
        ? 'Be direct and decisive while noting limits.'
        : 'Balance confidence with appropriate caution.'

  const lensHints: string[] = []
  if (profile.defaultLenses.safeguarding) lensHints.push('safeguarding lens')
  if (profile.defaultLenses.ofsted) lensHints.push('Ofsted / regulation lens')
  if (profile.defaultLenses.recording) lensHints.push('recording-quality prompts')

  const lines = [
    'Adult profile preferences (user-provided; does not access OS records):',
    `- Role: ${profile.roleLabel || roleLabelFor(profile.role)}`,
    profile.homeName ? `- Current setting: ${profile.homeName}` : null,
    profile.serviceType ? `- Service type: ${profile.serviceType}` : null,
    profile.team ? `- Team: ${profile.team}` : null,
    profile.shiftRole ? `- Shift role: ${profile.shiftRole}` : null,
    `- Preferred tone: ${profile.preferredTone}`,
    `- Answer length: ${profile.preferredAnswerLength} (${answerLength})`,
    `- Confidence framing: ${profile.confidencePreference} (${confidenceLine})`,
    `- Safeguarding intensity framing: ${profile.safeguardingIntensity}`,
    `- Writing style: ${profile.writingStyle}`,
    `- Reasoning depth: ${profile.cognitionPreferences.reasoningDepth}`,
    lensHints.length ? `- Default lenses to weave in when relevant: ${lensHints.join(', ')}` : null,
    profile.therapeuticPreferences ? `- Therapeutic preferences: ${profile.therapeuticPreferences}` : null,
    profile.preferredTerminology?.trim()
      ? `- Preferred terminology: ${profile.preferredTerminology.trim()}`
      : null,
    profile.cognitionPreferences.chronologyAwareness
      ? '- Apply longitudinal/chronology thinking where incidents or patterns are discussed.'
      : null,
    roleGuidance ? `- Role emphasis: ${roleGuidance}` : null,
    profile.customInstructions?.trim()
      ? `- Custom instructions for ORB: ${profile.customInstructions.trim()}`
      : null,
    profile.roleContextNotes?.trim() ? `- Role context: ${profile.roleContextNotes.trim()}` : null,
    profile.supervisionGoals?.trim() ? `- Supervision goals: ${profile.supervisionGoals.trim()}` : null,
    profile.currentFocusAreas?.trim() ? `- Current focus: ${profile.currentFocusAreas.trim()}` : null,
    profile.voicePreference?.prefersSpokenResponses
      ? '- User prefers spoken responses when auto-speak is enabled.'
      : null
  ].filter(Boolean) as string[]
  return lines.join('\n')
}

const PRIMARY_GENERIC_STARTERS = [
  'Help me think through an allegation safely',
  'Rewrite this professionally',
  'What would Ofsted expect?',
  'Help me reflect after a difficult shift'
]

export function roleBasedEmptyStarters(profile: AdultProfile): string[] {
  const role = normalizeAdultProfileRole(profile.role)
  if (role === 'registered_manager' || role === 'responsible_individual') {
    return [
      'What needs my oversight today?',
      'Help me review a safeguarding pattern',
      'Prepare a supervision conversation',
      'What would Ofsted ask?'
    ]
  }
  if (role === 'deputy_manager' || role === 'provider_director' || role === 'senior_support_worker') {
    return [
      'What should I escalate to the manager?',
      'Help me review overnight events',
      'Prepare handover points',
      'What would Ofsted look for?'
    ]
  }
  if (role === 'reg_44_visitor') {
    return [
      'What evidence would I expect to see?',
      'Help me frame a Reg 44 observation',
      'What questions should I ask the manager?',
      'Where might quality standards be thin?'
    ]
  }
  if (role === 'nvq_assessor') {
    return [
      'Help me map this practice to criteria',
      'What professional discussion questions fit?',
      'What evidence gaps do you see?',
      'Draft assessor feedback from what I describe'
    ]
  }
  if (role === 'nvq_learner' || role === 'diploma_learner') {
    return [
      'Explain this criterion in plain English',
      'Help me plan a reflective account',
      'What evidence might I already have?',
      'Turn this incident into reflective learning'
    ]
  }
  return PRIMARY_GENERIC_STARTERS
}

export function personalisedEmptyHeading(profile: AdultProfile): string {
  const first = profile.name?.trim().split(/\s+/)[0]
  if (first) return `How can I help today, ${first}?`
  return 'How can I help today?'
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function answerStyleHint(profile: AdultProfile): string | null {
  if (profile.preferredAnswerLength === 'brief') return 'I will keep answers concise unless safety needs more detail.'
  if (profile.preferredAnswerLength === 'detailed') return 'I can go into structured detail when that helps.'
  return null
}

function lensHint(profile: AdultProfile): string | null {
  const lenses: string[] = []
  if (profile.defaultLenses.safeguarding) lenses.push('safeguarding')
  if (profile.defaultLenses.ofsted) lenses.push('Ofsted and regulation')
  if (profile.defaultLenses.recording) lenses.push('recording quality')
  if (!lenses.length) return null
  return `Default lenses: ${lenses.join(', ')}.`
}

/** Personalised empty-state welcome — no implication of live OS record access. */
export function personalisedWelcomeMessage(
  profile: AdultProfile,
  options?: { temporary?: boolean }
): { heading: string; subline: string; temporaryNote?: string } {
  const first = profile.name?.trim().split(/\s+/)[0]
  const greeting = first ? `${timeOfDayGreeting()}, ${first}.` : `${timeOfDayGreeting()}.`
  const role = normalizeAdultProfileRole(profile.role)

  let capability =
    'I can help you think through everyday questions, recording quality, reflection and professional reasoning in children\'s homes.'

  if (
    role === 'registered_manager' ||
    role === 'responsible_individual' ||
    role === 'provider_director' ||
    role === 'deputy_manager'
  ) {
    capability =
      'I can help you think through recording, safeguarding, Ofsted evidence, shift planning and manager oversight — from what you share here, not live OS records.'
  } else if (
    role === 'residential_support_worker' ||
    role === 'senior_support_worker' ||
    role === 'night_staff' ||
    role === 'agency_staff' ||
    role === 'practitioner'
  ) {
    capability =
      'I can help you record clearly, think through what to do next, prepare handover, or check what might be missing — without accessing live care records.'
  } else if (role === 'reg_44_visitor') {
    capability =
      'I can help you frame observations, evidence questions and quality-of-care themes — standalone guidance only, not live home records.'
  } else if (role === 'nvq_assessor') {
    capability =
      'I can help you map evidence to criteria, draft PD questions and assessor feedback, and spot gaps — from what you describe only, not live learner portfolios.'
  } else if (role === 'nvq_learner' || role === 'diploma_learner') {
    capability =
      'I can explain criteria in plain English, structure reflective accounts, and suggest evidence — I will not invent workplace events; only what you tell me.'
  } else if (role === 'trainer_consultant') {
    capability =
      'I can help with briefings, learning questions and facilitation — standalone workforce development support, not live Academy records.'
  }

  const hints = [answerStyleHint(profile), lensHint(profile)].filter(Boolean) as string[]
  const sublineParts = [capability, ...hints, 'What would you like to work on?']

  const result: { heading: string; subline: string; temporaryNote?: string } = {
    heading: greeting,
    subline: sublineParts.join(' ')
  }

  if (options?.temporary) {
    result.temporaryNote =
      'Temporary chat is on — I won\'t use your saved ORB profile for this chat.'
  }

  return result
}
