'use client'

import type { ResidentialAgentId } from '@/lib/orb/residential-agents'

export type AdultProfileRole =
  | 'registered_manager'
  | 'deputy_manager'
  | 'team_leader'
  | 'senior_practitioner'
  | 'practitioner'
  | 'night_staff'
  | 'agency_staff'
  | 'reg_44_visitor'
  | 'provider_rep'
  | 'other'

export type AdultProfileTone = 'calm' | 'direct' | 'reflective' | 'coaching'
export type SafeguardingIntensity = 'standard' | 'heightened' | 'maximum'
export type WritingStyle = 'concise' | 'structured' | 'narrative'
export type ReasoningDepth = 'concise' | 'balanced' | 'deep'

export type AdultProfile = {
  id: string
  name: string
  role: AdultProfileRole
  roleLabel: string
  homeName: string
  team?: string
  shiftRole?: string
  permissions: string[]
  preferredAgent: ResidentialAgentId
  preferredTone: AdultProfileTone
  safeguardingIntensity: SafeguardingIntensity
  writingStyle: WritingStyle
  therapeuticPreferences: string
  accessibilityNotes: string
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

export const DEFAULT_ADULT_PROFILE: AdultProfile = {
  id: 'adult-default',
  name: '',
  role: 'practitioner',
  roleLabel: 'Residential practitioner',
  homeName: '',
  permissions: ['guidance', 'reflection', 'recording_support'],
  preferredAgent: 'ask_orb',
  preferredTone: 'calm',
  safeguardingIntensity: 'standard',
  writingStyle: 'structured',
  therapeuticPreferences: 'Trauma-informed, child-centred, repair-focused',
  accessibilityNotes: '',
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

export function roleLabelFor(role: AdultProfileRole): string {
  const labels: Record<AdultProfileRole, string> = {
    registered_manager: 'Registered Manager',
    deputy_manager: 'Deputy Manager',
    team_leader: 'Team Leader',
    senior_practitioner: 'Senior Practitioner',
    practitioner: 'Residential Practitioner',
    night_staff: 'Night Staff',
    agency_staff: 'Agency Staff',
    reg_44_visitor: 'Reg 44 Visitor',
    provider_rep: 'Provider Representative',
    other: 'Adult in role'
  }
  return labels[role] ?? 'Adult in role'
}

export function readAdultProfile(): AdultProfile {
  if (typeof window === 'undefined') return { ...DEFAULT_ADULT_PROFILE, updatedAt: Date.now() }
  try {
    const raw = window.localStorage.getItem(ADULT_PROFILE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ADULT_PROFILE, updatedAt: Date.now() }
    const parsed = JSON.parse(raw) as Partial<AdultProfile>
    return {
      ...DEFAULT_ADULT_PROFILE,
      ...parsed,
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

export function buildAdultProfilePromptBlock(profile: AdultProfile): string {
  const lines = [
    'Adult profile preferences (user-provided; does not access OS records):',
    `- Role: ${profile.roleLabel || roleLabelFor(profile.role)}`,
    profile.homeName ? `- Home: ${profile.homeName}` : null,
    profile.team ? `- Team: ${profile.team}` : null,
    profile.shiftRole ? `- Shift role: ${profile.shiftRole}` : null,
    `- Preferred tone: ${profile.preferredTone}`,
    `- Safeguarding intensity framing: ${profile.safeguardingIntensity}`,
    `- Writing style: ${profile.writingStyle}`,
    `- Reasoning depth: ${profile.cognitionPreferences.reasoningDepth}`,
    profile.therapeuticPreferences ? `- Therapeutic preferences: ${profile.therapeuticPreferences}` : null,
    profile.cognitionPreferences.chronologyAwareness
      ? '- Apply longitudinal/chronology thinking where incidents or patterns are discussed.'
      : null,
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
  if (profile.role === 'registered_manager') {
    return [
      'What needs my oversight today?',
      'Help me review a safeguarding pattern',
      'Prepare a supervision conversation',
      'What would Ofsted ask?'
    ]
  }
  if (profile.role === 'deputy_manager' || profile.role === 'team_leader') {
    return [
      'What should I escalate to the manager?',
      'Help me review overnight events',
      'Prepare handover points',
      'What would Ofsted look for?'
    ]
  }
  return PRIMARY_GENERIC_STARTERS
}

export function personalisedEmptyHeading(profile: AdultProfile): string {
  const first = profile.name?.trim().split(/\s+/)[0]
  if (first) return `How can I help today, ${first}?`
  return 'How can I help today?'
}
