/** Phase 3E — login product entrance copy for ORB Residential. */

export const ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE =
  'Specialist ethical intelligence for children\u2019s homes.'

export const ORB_LOGIN_FOUNDER_LINE =
  'Built from lived experience and professional responsibility \u2014 for the adults who write the records children may one day read.'

export const ORB_LOGIN_PRODUCT_EXPLANATION =
  'ORB Residential helps adults in Ofsted-regulated children\u2019s homes think before they write, capture rough information, talk through situations, create accessible communication support and keep professional judgement at the centre of every output.'

export const ORB_LOGIN_CAPABILITY_GROUPS = [
  {
    id: 'think',
    label: 'Think',
    description:
      'Chat and Voice help adults reflect, structure thinking and consider what may need recording before they write.'
  },
  {
    id: 'capture',
    label: 'Capture',
    description:
      'Dictate helps turn speech, rough notes and uploaded audio into clearer adult-reviewed drafts.'
  },
  {
    id: 'evidence',
    label: 'Evidence',
    description:
      'ORB Write, Communicate and Records help adults review wording, evidence the child\u2019s voice and keep outputs together.'
  }
] as const

export const ORB_LOGIN_PROFESSIONAL_BOUNDARY =
  'ORB supports professional judgement. It does not replace safeguarding procedures, managers, local policy or adult review.'

/** @deprecated Phase 3E — replaced by ORB_LOGIN_CAPABILITY_GROUPS on login entrance. */
export const ORB_LOGIN_STATION_DESCRIPTIONS = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Think through incidents, recording decisions, reflections and safeguarding before you write.'
  },
  {
    id: 'dictate',
    label: 'Dictate',
    description: 'Capture rough notes, audio or voice memos and turn them into safer drafts for adult review.'
  },
  {
    id: 'voice',
    label: 'Voice',
    description: 'Talk it through with ORB before you write.'
  },
  {
    id: 'communicate',
    label: 'Communicate',
    description: 'Create accessible explanations, visual supports and evidence of the child\u2019s voice.'
  },
  {
    id: 'write',
    label: 'ORB Write',
    description: 'Create, review and finalise safer care records.'
  },
  {
    id: 'records',
    label: 'Records & Drafts',
    description: 'Saved adult-reviewed outputs from Chat, Dictate, Voice, Communicate and ORB Write.'
  }
] as const
