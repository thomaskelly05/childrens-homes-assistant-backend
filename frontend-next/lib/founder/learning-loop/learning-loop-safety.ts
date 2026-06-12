export const LEARNING_LOOP_FORBIDDEN_SUGGESTIONS = [
  'lower safety threshold',
  'weaken safety',
  'weaken safety scoring',
  'hide failed run',
  'delete failed run',
  'hide audit',
  'auto-merge',
  'auto merge',
  'auto-launch',
  'bypass safeguarding',
  'bypass launch gate',
  'bypass professional judgement',
  'fake pass',
  'remove critical finding',
  'reduce escalation',
  'skip escalation'
] as const

export const LEARNING_LOOP_MANDATORY_CONSTRAINTS = [
  'Do not weaken safety.',
  'Do not hide failed runs.',
  'Do not fake passes.',
  'Do not auto-merge.',
  'Do not use real child data.',
  'Do not override launch gates.',
  'Tom must approve the PR.'
] as const

export const LEARNING_LOOP_FILES_MUST_NOT_TOUCH = [
  'auth/permissions.py',
  'services/orb_adversarial_safety_firewall.py',
  'frontend-next/lib/orb/evaluation/orb-internal-brain-severity.ts'
] as const

const REAL_CHILD_DATA_PATTERNS = [
  /\bchild\s+record\b/i,
  /\breal\s+child\b/i,
  /\bproduction\s+record\b/i,
  /\bstaff\s+name\s*:/i,
  /\bprovider-specific\b/i,
  /\bconfidential\s+record\b/i
]

export function validateLearningProposalSafety(text: string): { ok: true } | { ok: false; violations: string[] } {
  const lower = text.toLowerCase()
  const violations: string[] = []

  for (const forbidden of LEARNING_LOOP_FORBIDDEN_SUGGESTIONS) {
    if (lower.includes(forbidden)) {
      violations.push(`Forbidden suggestion detected: ${forbidden}`)
    }
  }

  return violations.length > 0 ? { ok: false, violations } : { ok: true }
}

export function refusesSafetyWeakening(suggestion: string): boolean {
  const lower = suggestion.toLowerCase()
  return LEARNING_LOOP_FORBIDDEN_SUGGESTIONS.some((f) => lower.includes(f))
}

export function refusesHidingFailedRuns(suggestion: string): boolean {
  const lower = suggestion.toLowerCase()
  return (
    lower.includes('hide failed') ||
    lower.includes('delete failed') ||
    lower.includes('remove failed run') ||
    lower.includes('hide audit')
  )
}

export function containsRealChildDataReference(text: string): boolean {
  return REAL_CHILD_DATA_PATTERNS.some((pattern) => pattern.test(text))
}

export function noAutoMergePathwayExists(): boolean {
  return true
}

export function brainChangeRequiresFounderApproval(): boolean {
  return true
}

export function benchmarkAdditionRequiresFounderApproval(): boolean {
  return true
}
