import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

/** Short labels for residential agent surfaces in standalone /orb. */
export const STANDALONE_MODE_CHIP_LABELS: Record<StandaloneOrbMode, string> = {
  'Ask ORB': 'Ask ORB',
  'Safeguarding Thinking': 'Safeguarding',
  'Ofsted Lens': 'Inspection',
  'Record This Properly': 'Record',
  'Therapeutic Reframe': 'Therapeutic',
  'Manager Copilot': 'Manager',
  'Staff Coach': 'Staff',
  'Reg 44 / Reg 45 Prep': 'Reg 44/45'
}

export const PRIMARY_MODE_CHIP_ORDER: StandaloneOrbMode[] = [
  'Ask ORB',
  'Safeguarding Thinking',
  'Ofsted Lens',
  'Record This Properly',
  'Therapeutic Reframe',
  'Manager Copilot',
  'Staff Coach',
  'Reg 44 / Reg 45 Prep'
]

export function modeChipLabel(mode: string): string {
  return STANDALONE_MODE_CHIP_LABELS[mode as StandaloneOrbMode] ?? mode
}
