import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

/** Short labels for mode chips in the standalone /orb UI. */
export const STANDALONE_MODE_CHIP_LABELS: Record<StandaloneOrbMode, string> = {
  'Ask ORB': 'Ask ORB',
  Safeguarding: 'Safeguarding',
  Reflect: 'Reflect',
  'Ofsted Lens': 'Ofsted',
  'Behaviour Support': 'Behaviour',
  'Record This Properly': 'Record'
}

export const PRIMARY_MODE_CHIP_ORDER: StandaloneOrbMode[] = [
  'Ask ORB',
  'Record This Properly',
  'Safeguarding',
  'Ofsted Lens',
  'Reflect'
]

export function modeChipLabel(mode: string): string {
  return STANDALONE_MODE_CHIP_LABELS[mode as StandaloneOrbMode] ?? mode
}
