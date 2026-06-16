export const ORB_DICTATE_TONE_OPTIONS = [
  'factual',
  'therapeutic',
  'reflective',
  'professional',
  'concise',
  'ofsted_ready',
  'safeguarding_aware',
  'parent_friendly',
  'ri_summary'
] as const

export type OrbDictateToneLock = (typeof ORB_DICTATE_TONE_OPTIONS)[number]

export const ORB_DICTATE_TONE_LABELS: Record<OrbDictateToneLock, string> = {
  factual: 'Factual',
  therapeutic: 'Therapeutic',
  reflective: 'Reflective',
  professional: 'Professional',
  concise: 'Concise',
  ofsted_ready: 'Inspection evidence support',
  safeguarding_aware: 'Safeguarding-aware',
  parent_friendly: 'Parent-friendly',
  ri_summary: 'RI summary'
}

export function toneInstructionForLock(tone: OrbDictateToneLock): string {
  return `Preserve a ${ORB_DICTATE_TONE_LABELS[tone].toLowerCase()} tone. Do not rewrite direct quotes unless explicitly asked.`
}

export function isOrbDictateToneLock(value: string | undefined): value is OrbDictateToneLock {
  return Boolean(value && ORB_DICTATE_TONE_OPTIONS.includes(value as OrbDictateToneLock))
}
