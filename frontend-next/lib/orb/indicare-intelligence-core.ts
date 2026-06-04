/** IndiCare Intelligence Core metadata from standalone/OS ORB API responses. */

export type IndicareIntelligenceGapChip = {
  id: string
  label: string
}

export type IndicareIntelligenceCoreView = {
  version?: string
  expert_depth?: string
  care_relevance_score?: number
  active_intelligence_layers?: string[]
  registered_home_domains?: string[]
  quality_standard_hits?: string[]
  professional_lens_hits?: string[]
  source_basis?: Record<string, unknown>
  missing_evidence?: IndicareIntelligenceGapChip[]
  gaps?: Array<Record<string, unknown>>
  quality_gate_preview?: Record<string, unknown>
}

export type IndicareAnswerQualityGate = {
  passed?: boolean
  composite_score?: number
  critical_flags?: string[]
  recommendations?: string[]
}

const REVIEW_DEPTHS = new Set(['residential_deep', 'safeguarding_critical'])

const SAFEGUARDING_CRITICAL_TERMS = [
  'immediate danger',
  'suicide',
  'self-harm',
  'self harm',
  'weapon',
  'abuse',
  'sexual harm',
  'exploitation',
  'county lines',
  'lado',
  'allegation',
  'missing from care',
  'medication error',
  'peer-on-peer',
  'peer on peer',
  'emergency'
]

const RECORD_CTA_TERMS = [
  'incident',
  'daily log',
  'restraint',
  'missing',
  'self-harm',
  'self harm',
  'allegation',
  'complaint',
  'medication',
  'education'
]

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Prefer indicare_intelligence_core; fall back to indicare_intelligence or legacy expert_brain_9. */
export function extractIndicareIntelligenceCore(
  contextUsed?: Record<string, unknown> | null
): IndicareIntelligenceCoreView | null {
  const ctx = asRecord(contextUsed)
  if (!ctx) return null

  const direct =
    asRecord(ctx.indicare_intelligence_core) ??
    asRecord(ctx.indicare_intelligence) ??
    asRecord(ctx.expert_brain_9)?.indicare_intelligence_core ??
    asRecord(ctx.expert_brain_9)

  if (!direct) return null

  const missing = Array.isArray(direct.missing_evidence)
    ? (direct.missing_evidence as IndicareIntelligenceGapChip[])
    : undefined

  return {
    version: typeof direct.version === 'string' ? direct.version : undefined,
    expert_depth: typeof direct.expert_depth === 'string' ? direct.expert_depth : undefined,
    care_relevance_score:
      typeof direct.care_relevance_score === 'number' ? direct.care_relevance_score : undefined,
    active_intelligence_layers: Array.isArray(direct.active_intelligence_layers)
      ? (direct.active_intelligence_layers as string[])
      : undefined,
    registered_home_domains: Array.isArray(direct.registered_home_domains)
      ? (direct.registered_home_domains as string[])
      : undefined,
    quality_standard_hits: Array.isArray(direct.quality_standard_hits)
      ? (direct.quality_standard_hits as string[])
      : undefined,
    professional_lens_hits: Array.isArray(direct.professional_lens_hits)
      ? (direct.professional_lens_hits as string[])
      : undefined,
    source_basis: asRecord(direct.source_basis) ?? undefined,
    missing_evidence: missing,
    gaps: Array.isArray(direct.gaps) ? (direct.gaps as Array<Record<string, unknown>>) : undefined,
    quality_gate_preview: asRecord(direct.quality_gate_preview) ?? undefined
  }
}

export function extractAnswerQualityGate(
  contextUsed?: Record<string, unknown> | null
): IndicareAnswerQualityGate | null {
  const ctx = asRecord(contextUsed)
  if (!ctx) return null
  const gate = asRecord(ctx.answer_quality_gate)
  if (!gate) return null
  return {
    passed: typeof gate.passed === 'boolean' ? gate.passed : undefined,
    composite_score: typeof gate.composite_score === 'number' ? gate.composite_score : undefined,
    critical_flags: Array.isArray(gate.critical_flags) ? (gate.critical_flags as string[]) : undefined,
    recommendations: Array.isArray(gate.recommendations)
      ? (gate.recommendations as string[])
      : undefined
  }
}

/** Lightweight client depth estimate for voice transcript review (mirrors Core thresholds). */
export function estimateTranscriptExpertDepth(transcript: string): string {
  const lower = transcript.trim().toLowerCase()
  if (!lower) return 'general_light'
  if (SAFEGUARDING_CRITICAL_TERMS.some((term) => lower.includes(term))) {
    return 'safeguarding_critical'
  }
  const careHints = [
    'child',
    'young person',
    'yp ',
    'safeguarding',
    'incident',
    'missing',
    'record',
    'staff',
    'home'
  ]
  const hits = careHints.filter((t) => lower.includes(t)).length
  if (hits >= 3 || lower.length > 120) return 'residential_deep'
  if (hits >= 1) return 'residential_light'
  return 'general_light'
}

export function shouldPauseVoiceAutoSend(transcript: string): boolean {
  const depth = estimateTranscriptExpertDepth(transcript)
  return REVIEW_DEPTHS.has(depth)
}

export function shouldShowRecordProperlyCta(
  message: string,
  core: IndicareIntelligenceCoreView | null
): boolean {
  const lower = message.toLowerCase()
  if (RECORD_CTA_TERMS.some((t) => lower.includes(t))) return true
  const depth = core?.expert_depth
  return depth === 'residential_deep' || depth === 'safeguarding_critical'
}

export function shouldShowManagerOversightCta(
  core: IndicareIntelligenceCoreView | null,
  qualityGate: IndicareAnswerQualityGate | null
): boolean {
  const depth = core?.expert_depth
  if (depth === 'safeguarding_critical' || depth === 'residential_deep') return true
  if ((core?.care_relevance_score ?? 0) >= 70) return true
  return Boolean(qualityGate?.passed === false)
}

export function shouldBlockAutoSpokenReply(options: {
  voiceRepliesEnabled: boolean
  privacyMode?: boolean
  lowSensoryMode?: boolean
  expertDepth?: string
  mode?: string
  urgentSafeguarding?: boolean
}): boolean {
  if (!options.voiceRepliesEnabled) return true
  if (options.privacyMode || options.lowSensoryMode) return true
  if (options.urgentSafeguarding || options.mode === 'Safeguarding Thinking') return true
  const depth = options.expertDepth
  if (depth === 'safeguarding_critical') return true
  return false
}

export function managerCanExpandIntelligence(role: string | null | undefined): boolean {
  const normalised = (role || '').toLowerCase()
  return (
    normalised.includes('manager') ||
    normalised.includes('registered') ||
    normalised.includes('ri') ||
    normalised.includes('admin') ||
    normalised.includes('provider')
  )
}

/** Context-aware follow-up chip item (matches OrbSuggestedReplyItem shape). */
export type IntelligenceContextActionChip = {
  action: string
  label: string
  prefill?: string
}

const GENERAL_UNRELATED_RE =
  /^(what is the capital of|who is the president|capital of france|weather in|tell me a joke|2\s*\+\s*2)/i

function normaliseExpertDepth(core: IndicareIntelligenceCoreView | null | undefined): string {
  const depth = (core?.expert_depth || 'general_light').trim().toLowerCase()
  if (
    depth === 'residential_standard' ||
    depth === 'residential_light' ||
    depth === 'residential_deep' ||
    depth === 'safeguarding_critical'
  ) {
    return depth
  }
  return 'general_light'
}

function isObviouslyGeneralUnrelated(messageHint: string, content: string): boolean {
  const hint = messageHint.trim()
  if (!hint) return false
  if (GENERAL_UNRELATED_RE.test(hint)) return true
  if (
    hint.length < 40 &&
    !/\b(child|young person|home|staff|record|incident|safeguarding)\b/i.test(hint) &&
    !/\b(child|young person|home|staff|record|incident|safeguarding|ofsted|care)\b/i.test(content.slice(0, 200))
  ) {
    return /^(hi|hello|hey)\b/i.test(hint)
  }
  return false
}

/** Build context-aware follow-up chips from Core depth and message context. */
export function buildIntelligenceContextActionChips(options: {
  core?: IndicareIntelligenceCoreView | null
  messageHint?: string
  content?: string
  mode?: string
}): IntelligenceContextActionChip[] {
  const hint = (options.messageHint || '').trim()
  const content = (options.content || '').trim()
  const depth = normaliseExpertDepth(options.core)

  if (!hint && !content) return []

  if (isObviouslyGeneralUnrelated(hint, content)) {
    return [
      { action: 'more_concise', label: 'Make shorter' },
      { action: 'more_detailed', label: 'Explain more' }
    ]
  }

  if (depth === 'general_light') {
    return [
      { action: 'more_concise', label: 'Make shorter' },
      { action: 'more_detailed', label: 'Explain more' },
      { action: 'reflective_learning', label: 'Save' }
    ]
  }

  if (depth === 'residential_light' || depth === 'residential_standard') {
    return [
      { action: 'recording_wording', label: 'Record this properly' },
      { action: 'what_missing', label: 'What am I missing?' },
      { action: 'safeguarding_lens', label: 'Add safeguarding lens' },
      { action: 'ofsted_lens', label: 'Add Ofsted lens' },
      {
        action: 'shift_builder',
        label: 'Create action plan',
        prefill: 'Create an action plan from this.'
      }
    ]
  }

  if (depth === 'residential_deep' || depth === 'safeguarding_critical') {
    return [
      { action: 'manager_oversight', label: 'Manager oversight' },
      { action: 'what_missing', label: 'What needs recording?' },
      {
        action: 'safeguarding_lens',
        label: 'Escalation considerations',
        prefill: 'What escalation considerations should I think about here?'
      },
      { action: 'evidence_gaps', label: 'Missing evidence' },
      {
        action: 'shift_builder',
        label: 'Create action plan',
        prefill: 'Create an action plan from this.'
      }
    ]
  }

  return [
    { action: 'more_concise', label: 'Make shorter' },
    { action: 'what_missing', label: 'What am I missing?' }
  ]
}

export const ORB_INTELLIGENCE_MICRO_STATUS_MESSAGES = [
  'Checking context…',
  'Checking recording gaps…',
  'Checking professional lenses…',
  'Preparing answer…'
] as const

export function intelligenceMicroStatusForDepth(
  depth: string | undefined,
  index: number
): string | null {
  const normalised = (depth || 'general_light').trim().toLowerCase()
  if (normalised === 'general_light') return null
  const messages = ORB_INTELLIGENCE_MICRO_STATUS_MESSAGES
  return messages[index % messages.length] ?? messages[0]
}
