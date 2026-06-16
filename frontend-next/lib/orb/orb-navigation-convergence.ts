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

export const ORB_VISIBLE_MAIN_NAV_IDS = [
  'chat',
  'orb_dictate',
  'orb_voice',
  'orb_write'
] as const

export const ORB_VISIBLE_LIBRARY_NAV_IDS = ['templates', 'documents', 'saved'] as const

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
    destination: { kind: 'station', station: 'templates' },
    message:
      'Shift Builder has moved into Templates and ORB Write. Start from the Handover template or ask ORB in Chat.',
    templatesRecordTypeId: 'handover',
    templatesSearch: 'handover'
  },
  review: {
    destination: { kind: 'station', station: 'orb_write' },
    message:
      'Review has moved into ORB Write assistant actions and Chat. Use “Review this record” in ORB Write or ask ORB in Chat.'
  },
  inspection_readiness: {
    destination: { kind: 'station', station: 'documents' },
    message:
      'Inspection evidence preparation has moved into Documents & Guidance and Chat. Use the Ofsted lens or ask ORB in Chat.',
    documentLens: 'ofsted'
  },
  safeguarding_thinking: {
    destination: {
      kind: 'chat',
      prompt:
        'Help me think through a safeguarding concern step by step. Ask clarifying questions before suggesting actions.',
      mode: 'Safeguarding Thinking'
    },
    message:
      'Safeguarding Thinking has moved into Chat starters and Templates. Start a safeguarding concern template or ask ORB in Chat.'
  },
  record_properly: {
    destination: { kind: 'station', station: 'orb_dictate' },
    message:
      'Record This Properly has moved into Dictate, ORB Write and Templates. Capture rough notes in Dictate or polish in ORB Write.'
  },
  knowledge: {
    destination: { kind: 'station', station: 'documents' },
    message: 'Knowledge Library has merged into Documents & Guidance — policies, guidance and document analyser.'
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
  { text: 'Record this properly', mode: 'Record This Properly' },
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
