import type { OrbFailureClassification } from './orb-quality-agent-types.ts'

const FORBIDDEN_SUGGESTIONS = [
  'lower safety threshold',
  'weaken safety',
  'hide failed run',
  'delete failed run',
  'auto-merge',
  'auto merge',
  'bypass safeguarding',
  'bypass local policy',
  'bypass manager oversight',
  'bypass professional judgement',
  'mark infrastructure as pass',
  'fake pass',
  'remove critical finding'
]

const CLASSIFICATION_CHANGE_CONSTRAINTS: Record<
  OrbFailureClassification,
  { mustNotChange: string[]; warningIfChanging: string[] }
> = {
  adversarial_firewall_gap: {
    mustNotChange: ['high-risk scaffold', 'scorer threshold'],
    warningIfChanging: ['adversarial safety firewall']
  },
  firewall_scorer_false_positive: {
    mustNotChange: ['adversarial firewall blocking', 'safety threshold'],
    warningIfChanging: ['firewall adversarial scorer calibration']
  },
  high_risk_scaffold_gap: {
    mustNotChange: ['adversarial firewall'],
    warningIfChanging: ['high-risk marker map', 'high-risk repair prompt']
  },
  high_risk_repair_gap: {
    mustNotChange: ['adversarial firewall'],
    warningIfChanging: ['high-risk repair prompt']
  },
  deterministic_fallback_gap: {
    mustNotChange: ['adversarial firewall', 'scorer threshold'],
    warningIfChanging: ['deterministic fallback templates']
  },
  infrastructure_provider_error: {
    mustNotChange: ['adversarial firewall', 'high-risk scaffold', 'scorer threshold'],
    warningIfChanging: ['infrastructure retry handling']
  },
  frontend_display_or_persistence_issue: {
    mustNotChange: ['safety thresholds', 'scorer logic'],
    warningIfChanging: ['display/persistence wiring']
  },
  scorer_threshold_or_context_issue: {
    mustNotChange: ['safety thresholds', 'adversarial firewall'],
    warningIfChanging: ['scorer context alignment']
  },
  genuine_answer_quality_issue: {
    mustNotChange: ['safety thresholds'],
    warningIfChanging: ['brain prompts', 'fallback quality']
  },
  launch_gate_blocker: {
    mustNotChange: ['safety thresholds', 'evaluation history'],
    warningIfChanging: ['launch gate evidence']
  }
}

export const SAFETY_CONSTRAINTS_ALWAYS = [
  'Do not weaken safety.',
  'Do not hide failed runs.',
  'Do not fake passes.',
  'Do not auto-merge.',
  'Tom must approve the PR.'
] as const

export const PRESERVED_SAFEGUARDING_PRINCIPLES = [
  'child-centred language',
  'safeguarding escalation',
  'local policy caveat',
  'professional judgement caveat',
  'no diagnosis boundary',
  'no invented law',
  'non-punitive wording',
  'data minimisation',
  'manager/DSL/on-call escalation where relevant'
] as const

export function validateSafetyCompliance(text: string): { ok: true } | { ok: false; violations: string[] } {
  const lower = text.toLowerCase()
  const violations: string[] = []
  for (const forbidden of FORBIDDEN_SUGGESTIONS) {
    if (lower.includes(forbidden)) {
      violations.push(`Forbidden suggestion detected: ${forbidden}`)
    }
  }
  if (violations.length > 0) {
    return { ok: false, violations }
  }
  return { ok: true }
}

export function refusesAutoMerge(): boolean {
  return true
}

export function refusesToHideFailedRuns(): boolean {
  return true
}

export function refusesToWeakenThresholds(suggestion: string): boolean {
  const lower = suggestion.toLowerCase()
  return (
    lower.includes('lower threshold') ||
    lower.includes('lower safety threshold') ||
    lower.includes('weaken safety') ||
    lower.includes('reduce safeguard') ||
    lower.includes('skip escalation')
  )
}

export function getFilesMustNotChange(classification: OrbFailureClassification): string[] {
  const constraints = CLASSIFICATION_CHANGE_CONSTRAINTS[classification]
  const files: string[] = []
  for (const item of constraints.mustNotChange) {
    if (item.includes('adversarial firewall')) {
      files.push('services/orb_adversarial_safety_firewall.py')
    }
    if (item.includes('high-risk scaffold') || item.includes('high-risk marker')) {
      files.push('frontend-next/lib/orb/evaluation/orb-high-risk-scoring-context.ts')
      files.push('services/orb_live_guardrail_service.py')
    }
    if (item.includes('scorer')) {
      files.push('frontend-next/lib/orb/evaluation/orb-evaluation-scoring-engine.ts')
      files.push('frontend-next/lib/orb/evaluation/orb-firewall-scorer-calibration.ts')
    }
    if (item.includes('safety threshold')) {
      files.push('frontend-next/lib/orb/evaluation/orb-internal-brain-severity.ts')
    }
  }
  return [...new Set(files)]
}

export function getChangeConstraints(classification: OrbFailureClassification): {
  mustNotChange: string[]
  warningIfChanging: string[]
} {
  return CLASSIFICATION_CHANGE_CONSTRAINTS[classification]
}
