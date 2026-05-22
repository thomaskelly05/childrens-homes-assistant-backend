export const ORB_CARE_COMPANION_CONFIG = {
  product: 'ORB Care Companion',
  surface: 'standalone_orb_ai',
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
    config: '/orb/config',
    conversation: '/orb/conversation',
    sessionStart: '/orb/session/start',
    realtimeSocket: '/orb/realtime/ws'
  },
  modeDetails: {
    'Ask ORB': 'Voice-first guidance for residential care practice. ORB supports reflection, safeguarding thinking and Ofsted-ready practice.',
    Safeguarding: 'Start with immediate safety, escalation, professional curiosity and clear recording.',
    Reflect: 'Slow the situation down and turn practice moments into learning.',
    'Ofsted Lens': 'Think through evidence, impact, leadership oversight and care quality.',
    'Behaviour Support': 'Consider what the behaviour may communicate and what support should follow.',
    'Record This Properly': 'Shape the event into clear, factual, child-centred recording prompts.'
  }
}

export function getOrbModeDetail(mode) {
  return ORB_CARE_COMPANION_CONFIG.modeDetails[mode] || ORB_CARE_COMPANION_CONFIG.modeDetails['Ask ORB']
}
