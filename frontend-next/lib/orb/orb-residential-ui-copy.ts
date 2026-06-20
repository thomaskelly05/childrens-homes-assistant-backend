/** Phase 1F — billing and station presentation copy. */

export const ORB_HOME_PRODUCT_CONTEXT_ROW =
  'Chat \u00b7 Dictate \u00b7 Voice \u00b7 ORB Write \u00b7 Records & Drafts'

export const ORB_RESIDENTIAL_BILLING_HEADER = 'ORB Residential'
export const ORB_RESIDENTIAL_BILLING_SUBTITLE = 'Specialist intelligence for children\u2019s homes.'

export const ORB_RESIDENTIAL_BILLING_PROVIDER_COPY =
  'Provider plans are being shaped with early users and organisations.'

export const ORB_VOICE_STATUS_CARD_COPY =
  'Voice is for reflective support. Audio is not stored. Review any transcript before use.'

export const ORB_VOICE_V2_TITLE = 'Ready to talk'
export const ORB_VOICE_V2_PROMPT = 'Talk it through with ORB before you write.'
export const ORB_VOICE_V2_BUTTON = 'Push to talk'

export const ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS = [
  'Chat',
  'Dictate',
  'Voice',
  'Communicate',
  'ORB Write',
  'Records & Drafts',
  'Guided Demo',
  'Help & Safety'
] as const

/** @deprecated Use ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS */
export const ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS = ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS

export const ORB_DICTATE_FLAGSHIP_WORKFLOW = [
  'Capture',
  'Transcript',
  'ORB Review',
  'Safer Draft',
  'ORB Write'
] as const

export const ORB_RECORDS_EMPTY_GUIDANCE =
  'Save from Chat, Dictate, Voice, Communicate or ORB Write when wording is ready for adult review.'
