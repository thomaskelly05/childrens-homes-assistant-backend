import { isIndicareLabDevelopmentMode } from '@/lib/indicare-lab/review-events/review-event-config'
import type { ReviewEvent, ReviewEventOrigin } from '@/lib/indicare-lab/review-events/types'

export type LabDataMode =
  | 'development-demo'
  | 'synthetic-benchmark'
  | 'real-shadow-review'
  | 'mixed-internal'

export type LabDataModeConfig = {
  mode: LabDataMode
  showDemoData: boolean
  showSyntheticBenchmarks: boolean
  requireRealEvidenceForSuggestions: boolean
  isDevelopment: boolean
  investorSafeView: boolean
}

const LAB_DATA_MODE_VALUES: LabDataMode[] = [
  'development-demo',
  'synthetic-benchmark',
  'real-shadow-review',
  'mixed-internal'
]

function readEnv(name: string): string | undefined {
  const publicName = `NEXT_PUBLIC_${name}`
  return (
    (typeof process !== 'undefined' ? process.env[publicName] : undefined) ??
    (typeof process !== 'undefined' ? process.env[name] : undefined)
  )?.trim()
}

function readEnvBool(name: string, fallback: boolean): boolean {
  const raw = readEnv(name)
  if (raw === undefined || raw === '') return fallback
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes'
}

function parseLabDataMode(raw: string | undefined): LabDataMode | undefined {
  if (!raw) return undefined
  const normalised = raw.toLowerCase().replace(/_/g, '-')
  return LAB_DATA_MODE_VALUES.find((mode) => mode === normalised)
}

export function getDefaultLabDataMode(): LabDataMode {
  if (isIndicareLabDevelopmentMode()) {
    return 'mixed-internal'
  }
  return 'real-shadow-review'
}

export function getLabDataMode(): LabDataMode {
  const explicit = parseLabDataMode(readEnv('INDICARE_LAB_DATA_MODE'))
  return explicit ?? getDefaultLabDataMode()
}

export function shouldShowDemoData(mode?: LabDataMode): boolean {
  const resolvedMode = mode ?? getLabDataMode()
  const explicit = readEnv('INDICARE_LAB_SHOW_DEMO_DATA')
  if (explicit !== undefined && explicit !== '') {
    return readEnvBool('INDICARE_LAB_SHOW_DEMO_DATA', false)
  }
  if (resolvedMode === 'development-demo' || resolvedMode === 'mixed-internal') {
    return true
  }
  return isIndicareLabDevelopmentMode()
}

export function shouldShowSyntheticBenchmarks(): boolean {
  return readEnvBool('INDICARE_LAB_SHOW_SYNTHETIC_BENCHMARKS', true)
}

export function requiresRealEvidenceForSuggestions(): boolean {
  return readEnvBool('INDICARE_LAB_REQUIRE_REAL_EVIDENCE_FOR_SUGGESTIONS', true)
}

export function isInvestorSafeView(options?: {
  mode?: LabDataMode
  investorSafeOverride?: boolean
}): boolean {
  const mode = options?.mode ?? getLabDataMode()
  if (options?.investorSafeOverride !== undefined) {
    return options.investorSafeOverride
  }
  return mode === 'real-shadow-review' || mode === 'synthetic-benchmark'
}

export function getLabDataModeConfig(options?: {
  investorSafeOverride?: boolean
}): LabDataModeConfig {
  const mode = getLabDataMode()
  const investorSafeView = isInvestorSafeView({
    mode,
    investorSafeOverride: options?.investorSafeOverride
  })

  return {
    mode,
    showDemoData: investorSafeView ? false : shouldShowDemoData(mode),
    showSyntheticBenchmarks: shouldShowSyntheticBenchmarks(),
    requireRealEvidenceForSuggestions: requiresRealEvidenceForSuggestions(),
    isDevelopment: isIndicareLabDevelopmentMode(),
    investorSafeView
  }
}

export const LAB_DATA_MODE_LABELS: Record<LabDataMode, string> = {
  'development-demo': 'Development demo',
  'synthetic-benchmark': 'Synthetic benchmark',
  'real-shadow-review': 'Real shadow review',
  'mixed-internal': 'Mixed internal'
}

/** Legacy origin values mapped to canonical Phase 6 origins. */
export function normalizeReviewEventOrigin(origin: string): ReviewEventOrigin {
  switch (origin) {
    case 'seeded':
      return 'seeded-demo'
    case 'internal-test':
      return 'internal-review-test'
    case 'seeded-demo':
    case 'internal-review-test':
    case 'shadow-review':
    case 'benchmark-generated':
    case 'imported':
      return origin
    default:
      return 'imported'
  }
}

export function isSeededDemoOrigin(origin: ReviewEventOrigin | string): boolean {
  return normalizeReviewEventOrigin(origin) === 'seeded-demo'
}

export function isRealShadowReviewOrigin(origin: ReviewEventOrigin | string): boolean {
  return normalizeReviewEventOrigin(origin) === 'shadow-review'
}

export function isInternalReviewTestOrigin(origin: ReviewEventOrigin | string): boolean {
  return normalizeReviewEventOrigin(origin) === 'internal-review-test'
}

export function isBenchmarkGeneratedOrigin(origin: ReviewEventOrigin | string): boolean {
  return normalizeReviewEventOrigin(origin) === 'benchmark-generated'
}

export function filterReviewEventsByDataMode(
  events: ReviewEvent[],
  config?: Pick<LabDataModeConfig, 'showDemoData' | 'investorSafeView'>
): ReviewEvent[] {
  const { showDemoData, investorSafeView } = config ?? getLabDataModeConfig()

  return events.filter((event) => {
    const origin = normalizeReviewEventOrigin(event.origin)

    if (investorSafeView || !showDemoData) {
      if (origin === 'seeded-demo') return false
    }

    if (investorSafeView && origin === 'internal-review-test') {
      return false
    }

    return true
  })
}

export function countRealShadowReviewEvents(events: ReviewEvent[]): number {
  return events.filter((event) => isRealShadowReviewOrigin(event.origin)).length
}

export function getVisibleReviewEvents(
  events: ReviewEvent[],
  options?: {
    originFilter?: ReviewEventOrigin | 'all'
    config?: Pick<LabDataModeConfig, 'showDemoData' | 'investorSafeView'>
  }
): ReviewEvent[] {
  const filtered = filterReviewEventsByDataMode(events, options?.config)
  const originFilter = options?.originFilter ?? 'all'

  if (originFilter === 'all') {
    return filtered
  }

  return filtered.filter(
    (event) => normalizeReviewEventOrigin(event.origin) === originFilter
  )
}

export type PatternDetectionFilters = {
  includeDemoEvents: boolean
  includeInternalTests: boolean
  includeShadowReviewEvents: boolean
  includeBenchmarkGenerated: boolean
}

export function getDefaultPatternDetectionFilters(
  config?: Pick<LabDataModeConfig, 'showDemoData' | 'investorSafeView' | 'mode' | 'showSyntheticBenchmarks'>
): PatternDetectionFilters {
  const resolved = config ?? getLabDataModeConfig()
  const investorSafe = resolved.investorSafeView

  return {
    includeDemoEvents: !investorSafe && resolved.showDemoData,
    includeInternalTests: !investorSafe && resolved.mode === 'mixed-internal',
    includeShadowReviewEvents: true,
    includeBenchmarkGenerated:
      resolved.showSyntheticBenchmarks && resolved.mode !== 'real-shadow-review'
  }
}

export function filterEventsForPatternDetection(
  events: ReviewEvent[],
  filters: PatternDetectionFilters
): ReviewEvent[] {
  return events.filter((event) => {
    const origin = normalizeReviewEventOrigin(event.origin)

    if (origin === 'seeded-demo' && !filters.includeDemoEvents) return false
    if (origin === 'internal-review-test' && !filters.includeInternalTests) return false
    if (origin === 'shadow-review' && !filters.includeShadowReviewEvents) return false
    if (origin === 'benchmark-generated' && !filters.includeBenchmarkGenerated) return false
    if (origin === 'imported') return true

    return true
  })
}
