import type {
  OrbClassificationAssessment,
  OrbDataClassificationGuidance,
  OrbDataClassificationLevel,
  OrbPrivacySurface
} from './orb-privacy-types'

const GREEN_EXAMPLES = [
  'General practice questions',
  'Generic safeguarding scenarios',
  'Training questions',
  'Policy questions',
  'Anonymised examples'
] as const

const AMBER_EXAMPLES = [
  'First names only where necessary',
  'Initials',
  'Partial contextual information',
  'Shift notes that have been checked',
  'Non-identifying summaries'
] as const

const RED_EXAMPLES = [
  'Full child records',
  'Full chronology',
  'Full date of birth',
  'NHS number',
  'Court documents',
  'Police reports',
  'Social worker reports',
  'Full addresses',
  'Identifiable family information',
  'Highly sensitive safeguarding narratives copied from records'
] as const

const SURFACE_NOTICES: Record<OrbPrivacySurface, string> = {
  chat:
    'Do not include unnecessary identifiable information. Use anonymised or minimal details where possible. Follow your local safeguarding procedures.',
  voice:
    'Voice sessions may create transcripts for drafting and support purposes. Do not use ORB for emergencies — follow local safeguarding and emergency procedures.',
  dictate:
    'Check the final record before use. You remain responsible for accuracy, safeguarding escalation and local policy compliance.',
  write:
    "ORB can improve wording, but staff must verify accuracy before saving or exporting. Behaviour is communication; keep the child's voice central.",
  export:
    "Exported documents may contain sensitive information. Store and share them according to your organisation's policy.",
  'privacy-page':
    'ORB is a support tool. Staff must follow organisational safeguarding procedures and avoid entering unnecessary identifiable information.'
}

const RED_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bNHS\s*(?:number|no\.?|#)?\s*:?\s*\d{3}\s?\d{3}\s?\d{4}\b/i, message: 'NHS numbers should not be entered in ORB.' },
  { pattern: /\b\d{3}\s?\d{3}\s?\d{4}\b/, message: 'Number sequences resembling NHS numbers were detected.' },
  { pattern: /\b(court order|court document|police report|social worker report|section 47|section 37)\b/i, message: 'Formal reports and court documents should not be pasted into ORB.' },
  { pattern: /\bdate of birth\b.{0,24}\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i, message: 'Full dates of birth should not be entered unless your organisation has explicitly approved this use.' },
  { pattern: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b.{0,24}\bdate of birth\b/i, message: 'Full dates of birth should not be entered unless your organisation has explicitly approved this use.' },
  { pattern: /\b\d{1,4}\s+[A-Za-z]+(?:\s+(?:Street|Road|Lane|Avenue|Close|Drive|Way|Court))(?:,?\s+[A-Za-z]+)?\s+[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i, message: 'Full addresses should not be entered in ORB.' },
  { pattern: /\b(full chronology|complete chronology|entire care record|full care record|complete child record)\b/i, message: 'Full records and chronologies should not be pasted into ORB.' }
]

const AMBER_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\b[A-Z][a-z]{1,20}\b/, message: 'A possible first name was detected — consider using initials instead.' },
  { pattern: /\b(initials?|first name only)\b/i, message: 'Use initials or minimal identifiers where possible.' },
  { pattern: /\bshift note\b/i, message: 'Check shift notes for identifying details before entering them.' }
]

export function getOrbDataClassificationGuidance(): OrbDataClassificationGuidance {
  return {
    green: {
      label: 'Green — generally safe to enter',
      summary: 'General practice questions, training scenarios and anonymised examples.',
      examples: [...GREEN_EXAMPLES]
    },
    amber: {
      label: 'Amber — use with care',
      summary: 'Minimal identifiers or checked summaries where context is needed.',
      examples: [...AMBER_EXAMPLES]
    },
    red: {
      label: 'Red — do not enter unless your organisation has explicitly approved this use',
      summary: 'Full records, formal reports and highly identifiable information.',
      examples: [...RED_EXAMPLES]
    },
    behaviourIsCommunication:
      'Behaviour is communication. ORB should support reflective, therapeutic understanding rather than punitive language.',
    childVoiceCentral: "The child's voice, wishes and feelings should remain central.",
    professionalJudgement:
      'ORB is a support tool, not a replacement for professional judgement. Staff must follow their organisation’s safeguarding procedures and local policies.'
  }
}

export function getOrbClassificationForInput(text: string): OrbClassificationAssessment {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) {
    return {
      level: 'green',
      warnings: [],
      guidance: SURFACE_NOTICES.chat,
      shouldWarn: false
    }
  }

  const redWarnings = RED_PATTERNS.filter(({ pattern }) => pattern.test(clean)).map(({ message }) => message)
  if (redWarnings.length) {
    return {
      level: 'red',
      warnings: redWarnings,
      guidance:
        'This looks like highly identifiable or formal record content. Remove unnecessary detail or use anonymised summaries unless your organisation has explicitly approved this use.',
      shouldWarn: true
    }
  }

  const amberWarnings = AMBER_PATTERNS.filter(({ pattern }) => pattern.test(clean)).map(({ message }) => message)
  if (amberWarnings.length) {
    return {
      level: 'amber',
      warnings: amberWarnings.slice(0, 2),
      guidance: 'Use initials or minimal detail where possible. Check accuracy and local policy before saving or exporting.',
      shouldWarn: true
    }
  }

  return {
    level: 'green',
    warnings: [],
    guidance: 'General practice content is usually fine. Avoid unnecessary identifiable information.',
    shouldWarn: false
  }
}

export function getOrbDataClassificationNotice(surface: OrbPrivacySurface): string {
  return SURFACE_NOTICES[surface]
}

export function getOrbClassificationLevelLabel(level: OrbDataClassificationLevel): string {
  const guidance = getOrbDataClassificationGuidance()
  if (level === 'green') return guidance.green.label
  if (level === 'amber') return guidance.amber.label
  return guidance.red.label
}
