import {
  modeChipLabel,
  PRIMARY_MODE_CHIP_ORDER,
  type StandaloneOrbMode
} from '@/lib/orb/orb-mode-registry'

/** Short labels for residential agent surfaces in standalone /orb. */
export const STANDALONE_MODE_CHIP_LABELS: Record<StandaloneOrbMode, string> = {
  'Ask ORB': modeChipLabel('Ask ORB'),
  'Safeguarding Thinking': modeChipLabel('Safeguarding Thinking'),
  'Ofsted Lens': modeChipLabel('Ofsted Lens'),
  'Record This Properly': modeChipLabel('Record This Properly'),
  'Therapeutic Reframe': modeChipLabel('Therapeutic Reframe'),
  'Manager Copilot': modeChipLabel('Manager Copilot'),
  'Staff Coach': modeChipLabel('Staff Coach'),
  'Reg 44 / Reg 45 Prep': modeChipLabel('Reg 44 / Reg 45 Prep'),
  'Reflect with ORB': modeChipLabel('Reflect with ORB'),
  'Behaviour Support': modeChipLabel('Behaviour Support'),
  'Policy Explainer': modeChipLabel('Policy Explainer'),
  'Scenario Simulator': modeChipLabel('Scenario Simulator')
}

export { modeChipLabel, PRIMARY_MODE_CHIP_ORDER }
