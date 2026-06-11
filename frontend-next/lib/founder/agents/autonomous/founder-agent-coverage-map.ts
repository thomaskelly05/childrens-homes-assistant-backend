import type { QualityRun } from '../../quality-lab/quality-lab-types.ts'
import type { OrbEvaluationRun } from '../../../orb/evaluation/orb-evaluation-types.ts'

import type {
  FounderCoverageArea,
  FounderCoverageAreaId,
  FounderCoverageMap,
  FounderCoverageStrength
} from './founder-agent-types'

type CoverageAreaDefinition = {
  id: FounderCoverageAreaId
  label: string
  keywords: string[]
  benchmarkFamilies?: string[]
}

export const COVERAGE_AREA_DEFINITIONS: CoverageAreaDefinition[] = [
  { id: 'missing_from_home', label: 'Missing from home', keywords: ['missing', 'absent', 'missing from care'] },
  { id: 'self_harm', label: 'Self-harm', keywords: ['self-harm', 'self harm', 'cutting'] },
  { id: 'suicidal_ideation', label: 'Suicidal ideation', keywords: ['suicid', 'end my life', 'ligature'] },
  { id: 'cse', label: 'CSE', keywords: ['cse', 'sexual exploitation', 'child sexual'] },
  { id: 'cce', label: 'CCE', keywords: ['county lines', 'criminal exploitation', 'cce'] },
  { id: 'online_harm', label: 'Online harm', keywords: ['online', 'grooming', 'digital harm'] },
  { id: 'radicalisation', label: 'Radicalisation', keywords: ['radicalis', 'extremism'] },
  {
    id: 'allegations_against_staff',
    label: 'Allegations against staff',
    keywords: ['allegation', 'staff conduct']
  },
  { id: 'whistleblowing', label: 'Whistleblowing', keywords: ['whistleblow', 'not to log', 'suppress'] },
  { id: 'medication', label: 'Medication', keywords: ['medication', 'mar sheet', 'controlled drug'] },
  {
    id: 'physical_intervention_restraint',
    label: 'Physical intervention / restraint',
    keywords: ['restraint', 'physical intervention']
  },
  { id: 'reg_20', label: 'Reg 20', keywords: ['reg 20', 'reg20', 'notification'] },
  { id: 'reg_44', label: 'Reg 44', keywords: ['reg 44', 'reg44'] },
  { id: 'reg_45', label: 'Reg 45', keywords: ['reg 45', 'reg45'] },
  { id: 'daily_records', label: 'Daily records', keywords: ['daily log', 'daily record', 'daily note'] },
  { id: 'incident_reflection', label: 'Incident reflection', keywords: ['incident', 'reflection', 'debrief'] },
  { id: 'care_planning', label: 'Care planning', keywords: ['care plan', 'placement plan'] },
  { id: 'risk_assessment', label: 'Risk assessment', keywords: ['risk assessment', 'risk plan'] },
  { id: 'supervision', label: 'Supervision', keywords: ['supervision', 'reflective supervision'] },
  { id: 'management_oversight', label: 'Management oversight', keywords: ['manager oversight', 'oversight', 'reg 13'] },
  { id: 'child_voice', label: 'Child voice', keywords: ['child voice', "young person's words"] },
  {
    id: 'autism_communication_needs',
    label: 'Autism and communication needs',
    keywords: ['autism', 'communication needs', 'aac']
  },
  {
    id: 'global_developmental_delay',
    label: 'Global developmental delay',
    keywords: ['developmental delay', 'gdd']
  },
  { id: 'equality_disability', label: 'Equality and disability', keywords: ['disability', 'equality', 'reasonable adjustment'] },
  { id: 'family_contact', label: 'Family contact', keywords: ['family contact', 'contact session'] },
  { id: 'education', label: 'Education', keywords: ['school', 'education', 'pep'] },
  { id: 'health_appointments', label: 'Health appointments', keywords: ['health', 'gp', 'appointment', 'camhs'] },
  { id: 'complaints', label: 'Complaints', keywords: ['complaint'] },
  { id: 'professional_meetings', label: 'Professional meetings', keywords: ['lac review', 'pep meeting', 'professional meeting'] },
  { id: 'data_protection', label: 'Data protection', keywords: ['data protection', 'gdpr', 'privacy'] },
  { id: 'ofsted_readiness', label: 'Ofsted readiness', keywords: ['ofsted', 'sccif', 'inspection'] }
]

function matchesArea(text: string, area: CoverageAreaDefinition): boolean {
  const haystack = text.toLowerCase()
  return area.keywords.some((kw) => haystack.includes(kw.toLowerCase()))
}

function strengthFromMetrics(scenariosRun: number, passRate: number | null, criticalFailures: number): FounderCoverageStrength {
  if (scenariosRun === 0) return 'untested'
  if (criticalFailures > 0 || (passRate !== null && passRate < 60)) return 'weak'
  if (passRate !== null && passRate >= 85) return 'strong'
  return 'moderate'
}

function isQualityRun(run: QualityRun | OrbEvaluationRun): run is QualityRun {
  return 'runMode' in run
}

function collectScenarioTexts(run: QualityRun | OrbEvaluationRun): { text: string; passed: boolean; critical: boolean; testedAt: string }[] {
  if (!('results' in run) || !Array.isArray(run.results)) return []

  const testedAt = run.completedAt ?? run.startedAt

  if (isQualityRun(run)) {
    return run.results.map((item) => ({
      text: `${item.scenarioTitle} ${item.scenarioId}`,
      passed: item.passed,
      critical: Boolean(item.criticalFailure),
      testedAt
    }))
  }

  return run.results.map((item) => ({
    text: `${item.question} ${item.scenarioId}`,
    passed: item.pass,
    critical: Boolean(item.criticalFailure),
    testedAt
  }))
}

export function buildFounderCoverageMap(input: {
  qualityRuns?: QualityRun[]
  evaluationRuns?: OrbEvaluationRun[]
  benchmarkTopics?: string[]
}): FounderCoverageMap {
  const allRuns = [...(input.qualityRuns ?? []), ...(input.evaluationRuns ?? [])]
  const scenarioResults = allRuns.flatMap(collectScenarioTexts)
  const benchmarkTopics = new Set((input.benchmarkTopics ?? []).map((t) => t.toLowerCase()))

  const areas: FounderCoverageArea[] = COVERAGE_AREA_DEFINITIONS.map((def) => {
    const matched = scenarioResults.filter((s) => matchesArea(s.text, def))
    const scenariosRun = matched.length
    const passed = matched.filter((s) => s.passed).length
    const passRate = scenariosRun > 0 ? Math.round((passed / scenariosRun) * 1000) / 10 : null
    const criticalFailures = matched.filter((s) => s.critical).length
    const lastTested =
      matched.length > 0
        ? matched
            .map((s) => s.testedAt)
            .sort()
            .reverse()[0]
        : null

    const weakMarkers: string[] = []
    if (criticalFailures > 0) weakMarkers.push(`${criticalFailures} critical failure(s)`)
    if (passRate !== null && passRate < 70) weakMarkers.push(`Pass rate ${passRate}%`)

    const recommendedNewScenarios: string[] = []
    if (scenariosRun === 0) {
      recommendedNewScenarios.push(`Add synthetic ${def.label.toLowerCase()} scenario to benchmark pack`)
    } else if (passRate !== null && passRate < 80) {
      recommendedNewScenarios.push(`Add adversarial variant for ${def.label.toLowerCase()}`)
    }

    const benchmarkCoverageExists =
      benchmarkTopics.has(def.label.toLowerCase()) ||
      def.keywords.some((kw) => benchmarkTopics.has(kw.toLowerCase()))

    return {
      id: def.id,
      label: def.label,
      scenariosRun,
      passRate,
      criticalFailures,
      lastTested,
      coverageStrength: strengthFromMetrics(scenariosRun, passRate, criticalFailures),
      weakMarkers,
      recommendedNewScenarios,
      benchmarkCoverageExists
    }
  })

  const weakAreas = areas.filter((a) => a.coverageStrength === 'weak').map((a) => a.id)
  const untestedAreas = areas.filter((a) => a.coverageStrength === 'untested').map((a) => a.id)

  const overallStrength: FounderCoverageStrength =
    untestedAreas.length > areas.length / 2
      ? 'untested'
      : weakAreas.length > 0
        ? 'weak'
        : areas.filter((a) => a.coverageStrength === 'strong').length > areas.length / 2
          ? 'strong'
          : 'moderate'

  return {
    generatedAt: new Date().toISOString(),
    areas,
    weakAreas,
    untestedAreas,
    overallStrength
  }
}

export function generateRecommendedScenariosForArea(areaId: FounderCoverageAreaId): string[] {
  const def = COVERAGE_AREA_DEFINITIONS.find((a) => a.id === areaId)
  if (!def) return []
  return [
    `Synthetic ${def.label} — baseline scenario`,
    `Synthetic ${def.label} — adversarial variant`,
    `Synthetic ${def.label} — child voice emphasis`
  ]
}
