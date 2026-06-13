/**
 * Shared ORB Residential safety, privacy and responsibility copy.
 * Import from here across Chat, Voice, Dictate, Write, Documents and billing surfaces.
 */

const APOS = '\u2019'

export const ORB_NOT_FOR_EMERGENCIES_COPY =
  'Do not use ORB for emergencies. Follow local safeguarding and emergency procedures.'

export const ORB_FOLLOW_SAFEGUARDING_COPY = `Follow your organisation${APOS}s safeguarding procedures.`

export const ORB_ADULT_REVIEW_REQUIRED_COPY =
  'Adult review required before saving, sharing or exporting.'

export const ORB_SUPPORTS_PROFESSIONAL_JUDGEMENT_COPY = 'ORB supports professional judgement.'

export const ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY =
  'ORB does not replace safeguarding procedures, management oversight or professional judgement.'

export const ORB_MINIMAL_IDENTIFIABLE_INFO_COPY =
  'Use anonymised or minimal identifiable information where possible.'

export const ORB_ADULT_REMAINS_RESPONSIBLE_COPY =
  'You remain responsible for accuracy, escalation and final approval.'

/** Calm adult-responsibility strip used across ORB Residential surfaces. */
export const ORB_RESIDENTIAL_SAFETY_STRIP = `ORB can help you reflect and improve wording. ${ORB_ADULT_REMAINS_RESPONSIBLE_COPY}`

export const ORB_RESIDENTIAL_PRIVACY_STRIP = `${ORB_MINIMAL_IDENTIFIABLE_INFO_COPY} ${ORB_FOLLOW_SAFEGUARDING_COPY}`

export const ORB_RESIDENTIAL_VOICE_PRIVACY_STRIP =
  'Voice sessions may create transcripts for drafting and support purposes. Do not use ORB for emergencies — follow local safeguarding and emergency procedures.'

export const ORB_RESIDENTIAL_VOICE_SAFETY_STRIP = `${ORB_SUPPORTS_PROFESSIONAL_JUDGEMENT_COPY} ${ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY} ${ORB_NOT_FOR_EMERGENCIES_COPY}`

export const ORB_RESIDENTIAL_DICTATE_RESPONSIBILITY_STRIP = `ORB can help structure and improve wording. ${ORB_ADULT_REMAINS_RESPONSIBLE_COPY}`

/** Compact privacy guidance shown on mobile home — full detail in bottom sheet. */
export const ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS = [
  'Use anonymised or minimal details where possible.',
  ORB_FOLLOW_SAFEGUARDING_COPY,
  'Do not use ORB for emergencies.',
  'Adult remains responsible.'
] as const

/** Voice boundary copy — after-call and settings surfaces. */
export const ORB_VOICE_BOUNDARY_COPY = [
  'Voice is for live support and reflection. Dictate is for turning speech into a structured record.',
  'Voice sessions may create transcripts for drafting and support purposes.',
  ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY,
  ORB_NOT_FOR_EMERGENCIES_COPY,
  'Review before relying on transcripts. ORB Residential does not access live care records.'
] as const

/** Post-subscribe safety modal bullets — aligned with full-screen acceptance themes. */
export const ORB_SAFETY_MODAL_POINTS = [
  ORB_SUPPORTS_PROFESSIONAL_JUDGEMENT_COPY,
  'ORB does not replace safeguarding procedures, managers, emergency services, local protocols or legal or medical advice.',
  'If there is immediate risk of harm, follow your organisation\'s procedures and contact emergency services where required.',
  'An adult must review ORB outputs before use in practice.'
] as const

export const ORB_SAFETY_ACCEPTANCE_INTRO =
  'ORB supports residential childcare professionals, but it does not replace professional judgement, safeguarding procedures, managers, emergency services or legal advice.'

export const ORB_SAFETY_ACCEPTANCE_STATEMENTS = [
  'I understand ORB is guidance and recording support, not a replacement for professional judgement.',
  'I understand urgent safeguarding concerns must follow my home’s safeguarding policy and local safeguarding procedures.',
  'I understand I must review, edit and approve ORB outputs before using them in professional records.',
  'I understand ORB Residential does not access live IndiCare OS care records.'
] as const
