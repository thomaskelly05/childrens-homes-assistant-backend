/** Standalone /orb panel ids — only one may be open at a time. */
export type OrbStandalonePanel =
  | 'tools'
  | 'documents'
  | 'agents'
  | 'templates'
  | 'knowledge'
  | 'saved_outputs'
  | 'memory'
  | 'accessibility'
  | 'permissions'
  | 'intelligence_map'
  | 'settings'
  | 'help'
  | 'voice'
  | 'orb_voice'
  | 'billing'
  | null

export const ORB_STANDALONE_PANEL_IDS: Exclude<OrbStandalonePanel, null>[] = [
  'tools',
  'documents',
  'agents',
  'templates',
  'knowledge',
  'saved_outputs',
  'memory',
  'accessibility',
  'permissions',
  'intelligence_map',
  'settings',
  'help',
  'voice',
  'orb_voice',
  'billing'
]

/** Map tools drawer tool ids to panel routes. */
export const ORB_TOOL_TO_PANEL: Record<string, Exclude<OrbStandalonePanel, null>> = {
  documents: 'documents',
  'deep-research': 'agents',
  agents: 'agents',
  knowledge: 'knowledge',
  outputs: 'saved_outputs',
  map: 'intelligence_map',
  memory: 'memory',
  a11y: 'accessibility',
  permissions: 'permissions',
  recording: 'tools',
  'action-plan': 'documents',
  policy: 'documents',
  'manager-brief': 'agents',
  'staff-brief': 'agents',
  safeguarding: 'agents',
  ofsted: 'agents'
}
