import type { OrbDocumentLens } from '@/lib/orb/document-intelligence'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export type OrbResidentialPracticePanelId =
  | 'inspection_readiness'
  | 'safeguarding_thinking'
  | 'record_properly'

/** Panel ids removed from primary sidebar — routes and components remain for compatibility. */
export type OrbDeprecatedPrimaryNavPanelId =
  | 'shift_builder'
  | 'review'
  | 'inspection_readiness'
  | 'safeguarding_thinking'
  | 'record_properly'
  | 'knowledge'

export const ORB_DEPRECATED_PRIMARY_NAV_PANEL_IDS: readonly OrbDeprecatedPrimaryNavPanelId[] = [
  'shift_builder',
  'review',
  'inspection_readiness',
  'safeguarding_thinking',
  'record_properly',
  'knowledge'
] as const

/** Phase 1A visible sidebar — Home through Settings only. */
export const ORB_VISIBLE_SIDEBAR_NAV_IDS = [
  'home',
  'chat',
  'orb_dictate',
  'orb_voice',
  'orb_write',
  'saved',
  'help',
  'settings'
] as const

/** @deprecated Use ORB_VISIBLE_SIDEBAR_NAV_IDS — kept for transitional imports. */
export const ORB_VISIBLE_MAIN_NAV_IDS = [
  'chat',
  'orb_dictate',
  'orb_voice',
  'orb_write'
] as const

/** Hidden from primary nav — templates/documents remain internal workflow support. */
export const ORB_VISIBLE_LIBRARY_NAV_IDS = [] as const

export type OrbConvergenceDestination =
  | { kind: 'station'; station: 'templates' | 'orb_write' | 'documents' | 'orb_dictate' }
  | { kind: 'chat'; prompt: string; mode?: StandaloneOrbMode }
  | { kind: 'redirect_card' }

export type OrbConvergenceRoute = {
  destination: Exclude<OrbConvergenceDestination, { kind: 'redirect_card' }>
  message: string
  documentLens?: OrbDocumentLens
  templatesRecordTypeId?: string
  templatesSearch?: string
}

const CONVERGENCE_ROUTES: Record<OrbDeprecatedPrimaryNavPanelId, OrbConvergenceRoute> = {
  shift_builder: {
    destination: {
      kind: 'chat',
      prompt: 'Help me prepare a handover note for the next shift — key risks, presentation and practical tasks.',
      mode: 'Record This Properly'
    },
    message:
      'Shift planning lives in Chat and Dictate now. Try a handover starter in Chat or capture notes in Dictate.'
  },
  review: {
    destination: { kind: 'station', station: 'orb_write' },
    message:
      'Review lives in ORB Write. Open a draft in Records & Drafts or use review actions in ORB Write.'
  },
  inspection_readiness: {
    destination: {
      kind: 'chat',
      prompt: 'Help me prepare inspection evidence thinking — impact on the child, adult actions and follow-up.',
      mode: 'Ofsted Lens'
    },
    message:
      'Inspection evidence preparation is a Chat starter now. Use Prepare for inspection or ask ORB in Chat.'
  },
  safeguarding_thinking: {
    destination: {
      kind: 'chat',
      prompt:
        'Help me think through a safeguarding concern step by step. Ask clarifying questions before suggesting actions.',
      mode: 'Safeguarding Thinking'
    },
    message:
      'Safeguarding reflection is a Chat starter. Use Safeguarding reflection or ask ORB in Chat — follow local procedures.'
  },
  record_properly: {
    destination: {
      kind: 'chat',
      prompt:
        'Help me record this properly. I will share rough notes — keep the child central and help me record observable facts clearly for adult review.',
      mode: 'Record This Properly'
    },
    message:
      'Use Help me record this properly in Chat, or capture rough notes in Dictate, then review in ORB Write.'
  },
  knowledge: {
    destination: { kind: 'chat', prompt: 'Help me understand a policy or guidance document I will describe.' },
    message: 'Guidance questions belong in Chat. Attach a document from the composer if you have one.'
  }
}

export function isDeprecatedPrimaryNavPanel(
  panelId: string
): panelId is OrbDeprecatedPrimaryNavPanelId {
  return (ORB_DEPRECATED_PRIMARY_NAV_PANEL_IDS as readonly string[]).includes(panelId)
}

export function resolveConvergedNavigation(
  panelId: OrbDeprecatedPrimaryNavPanelId
): OrbConvergenceRoute {
  return CONVERGENCE_ROUTES[panelId]
}

export function practicePanelToDeprecatedId(
  panel: OrbResidentialPracticePanelId
): OrbDeprecatedPrimaryNavPanelId {
  return panel
}

/**
 * Chat starters — kept in sync with `orb-converged-actions.ts` (`ORB_CONVERGED_CHAT_STARTER_ACTIONS`).
 * Residential surfaces import via `orb-residential-copy.ts` from the converged registry.
 */
export const ORB_CONVERGED_CHAT_STARTERS: Array<{ text: string; mode?: StandaloneOrbMode }> = [
  { text: 'Create a handover / shift plan' },
  { text: 'Review written practice' },
  { text: 'Think through a safeguarding concern', mode: 'Safeguarding Thinking' },
  { text: 'Prepare for inspection / Ofsted evidence', mode: 'Ofsted Lens' },
  { text: 'Help me record this properly', mode: 'Record This Properly' },
  { text: 'Create manager summary' },
  {
    text: 'Build action plan from Reg 44 / Statement of Purpose',
    mode: 'Reg 44 / Reg 45 Prep'
  },
  { text: 'Summarise recent changes' },
  { text: 'Turn policy into easy-read briefing' }
]

/** Recording library ids highlighted as common converged workflows in Templates. */
export const ORB_RECOMMENDED_RECORD_TYPE_IDS = [
  'handover',
  'safeguarding_concern',
  'reg_44_evidence_summary',
  'reg_45_reflection',
  'incident_report',
  'manager_summary',
  'daily_record',
  'chronology_entry'
] as const
