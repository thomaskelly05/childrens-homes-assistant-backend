export const ORB_CARE_COMPANION_CONFIG = {
  product: 'ORB Care Companion',
  surface: 'standalone_orb_ai',
  osLinked: false,
  careRecordAccess: false,
  directWrites: false,
  defaultMode: 'Ask ORB',
  modes: [
    'Ask ORB',
    'Safeguarding',
    'Reflect',
    'Ofsted Lens',
    'Behaviour Support',
    'Record This Properly'
  ],
  endpoints: {
    config: '/orb/standalone/config',
    conversation: '/orb/standalone/conversation',
    health: '/orb/standalone/health'
  },
  modeDetails: {
    'Ask ORB': 'Standalone voice-first guidance for residential care practice. ORB supports reflection, safeguarding thinking and Inspection evidence support practice without accessing OS records.',
    Safeguarding: 'Start with immediate safety, escalation, professional curiosity and clear recording. ORB gives guidance only and does not replace safeguarding procedures.',
    Reflect: 'Slow the situation down and turn practice moments into learning without pulling from operational records.',
    'Ofsted Lens': 'Think through evidence, impact, leadership oversight and care quality from a standalone guidance perspective.',
    'Behaviour Support': 'Consider what the behaviour may communicate and what support should follow.',
    'Record This Properly': 'Shape the event into clear, factual, child-centred recording prompts without writing to the OS.'
  }
}

export function getOrbModeDetail(mode) {
  return ORB_CARE_COMPANION_CONFIG.modeDetails[mode] || ORB_CARE_COMPANION_CONFIG.modeDetails['Ask ORB']
}
