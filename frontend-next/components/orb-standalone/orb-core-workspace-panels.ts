import type { OrbStandalonePanel } from '@/components/orb-standalone/orb-standalone-panel-types'

/** Core ORB tools that render in the main workspace (not centred modals) on `/orb`. */
export const ORB_CORE_WORKSPACE_PANELS = [
  'orb_dictate',
  'orb_write',
  'orb_voice',
  'documents',
  'shift_builder',
  'saved_outputs',
  'review',
  'inspection_readiness',
  'safeguarding_thinking',
  'record_properly',
  'templates',
  'knowledge',
  'skills'
] as const satisfies readonly Exclude<OrbStandalonePanel, null>[]

export type OrbCoreWorkspacePanel = (typeof ORB_CORE_WORKSPACE_PANELS)[number]

export function isOrbCoreWorkspacePanel(
  panel: OrbStandalonePanel
): panel is OrbCoreWorkspacePanel {
  return panel !== null && (ORB_CORE_WORKSPACE_PANELS as readonly string[]).includes(panel)
}
