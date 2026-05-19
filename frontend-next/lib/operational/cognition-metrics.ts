type Tone = 'blue' | 'emerald' | 'amber' | 'slate' | 'purple'

export type OperationalMetricPoint = {
  label: string
  value: number
  secondary?: number
}

export type OperationalSignalMetric = {
  label: string
  value: string | number
  detail?: string
  tone?: Tone
}

export type WellbeingRingMetric = {
  label: string
  value: number
  detail?: string
  tone?: Tone
}

type AnyRecord = Record<string, any>

function list(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.filter((item): item is AnyRecord => item && typeof item === 'object') : []
}

function num(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function text(value: unknown, fallback = ''): string {
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

function monthLabel(value: unknown): string {
  const raw = text(value)
  const date = raw ? new Date(raw) : null
  if (!date || Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleString('en-GB', { month: 'short' })
}

function eventText(event: AnyRecord): string {
  return `${text(event.title)} ${text(event.summary)} ${text(event.fullText)} ${text(event.eventType)} ${text(event.sourceType)}`.toLowerCase()
}

function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

export function buildChronologyTrendData(events: unknown): OperationalMetricPoint[] {
  const buckets = new Map<string, { total: number; high: number }>()
  for (const event of list(events)) {
    const label = monthLabel(event.dateTime || event.createdAt || event.updatedAt || event.date)
    const current = buckets.get(label) || { total: 0, high: 0 }
    current.total += 1
    if (/safeguarding|incident|missing|risk|high|critical/.test(eventText(event))) current.high += 1
    buckets.set(label, current)
  }
  const points = Array.from(buckets.entries()).map(([label, value]) => ({ label, value: value.total, secondary: value.high }))
  return points.length ? points.slice(-8) : [{ label: 'No data', value: 0, secondary: 0 }]
}

export function buildChronologyThemeData(events: unknown): OperationalMetricPoint[] {
  const themes: Record<string, RegExp> = {
    Safeguarding: /safeguarding|missing|risk|incident|harm/,
    Relationships: /relationship|family|contact|keywork|trusted|repair/,
    Education: /school|education|attendance|learning|achievement/,
    Health: /health|medication|appointment|sleep|wellbeing/,
    Voice: /wishes|feelings|voice|consultation|about me/,
    Oversight: /manager|review|signed|approved|action/
  }
  const rows = Object.entries(themes).map(([label, pattern]) => ({
    label,
    value: list(events).filter((event) => pattern.test(eventText(event))).length
  }))
  return rows.some((row) => row.value > 0) ? rows : [{ label: 'No themes', value: 0 }]
}

export function buildCommandCentreSignals(platform: AnyRecord, governance: AnyRecord, workforce: AnyRecord): OperationalSignalMetric[] {
  const children = list(platform.children).length
  const chronology = list(platform.chronology).length
  const safeguarding = list(platform.safeguarding).length
  const alerts = list(platform.attention).length + list(workforce.alerts).length + list(governance.governance_actions).length
  return [
    { label: 'Children', value: children, detail: 'Visible child records', tone: 'blue' },
    { label: 'Chronology', value: chronology, detail: 'Live chronology records', tone: chronology ? 'emerald' : 'slate' },
    { label: 'Safeguarding', value: safeguarding, detail: 'Visible safeguarding posture', tone: safeguarding ? 'amber' : 'emerald' },
    { label: 'Review queue', value: alerts, detail: 'Platform, governance and workforce alerts', tone: alerts ? 'purple' : 'slate' }
  ]
}

export function buildOperationalPressureData(platform: AnyRecord, governance: AnyRecord, workforce: AnyRecord): OperationalMetricPoint[] {
  return [
    { label: 'Safeguarding', value: list(platform.safeguarding).length },
    { label: 'Actions', value: list(platform.actions).length + list(governance.governance_actions).length },
    { label: 'Workforce', value: list(workforce.alerts).length + list(workforce.wellbeing_alerts).length },
    { label: 'Evidence gaps', value: num(governance.summary?.evidence_gaps) },
    { label: 'Documents', value: list(platform.documents).length }
  ]
}

export function buildWellbeingRings(platform: AnyRecord, workforce: AnyRecord): WellbeingRingMetric[] {
  const chronology = list(platform.chronology)
  const wellbeing = chronology.filter((event) => /wellbeing|settled|calm|emotion|regulation|positive/.test(eventText(event))).length
  const risk = chronology.filter((event) => /incident|missing|risk|safeguarding|distress/.test(eventText(event))).length
  const workforceAlerts = list(workforce.alerts).length + list(workforce.wellbeing_alerts).length
  return [
    {
      label: 'Child wellbeing',
      value: chronology.length ? percent(wellbeing, chronology.length) : 0,
      detail: 'Wellbeing language in chronology',
      tone: 'blue'
    },
    {
      label: 'Risk visibility',
      value: chronology.length ? percent(risk, chronology.length) : 0,
      detail: 'Risk themes visible for review',
      tone: risk ? 'amber' : 'emerald'
    },
    {
      label: 'Workforce support',
      value: Math.max(0, 100 - Math.min(100, workforceAlerts * 12)),
      detail: 'Lower pressure means stronger support posture',
      tone: workforceAlerts ? 'purple' : 'emerald'
    }
  ]
}

export function buildReflectivePrompts(platform: AnyRecord, governance: AnyRecord, workforce: AnyRecord): string[] {
  const prompts = [
    'What changed for children after adult support, not only what adults completed?',
    'Is child voice visible in daily care, documents and review records?',
    'Do chronology, risk plans and management oversight align clearly?'
  ]
  if (list(platform.safeguarding).length) prompts.push('Which safeguarding themes may require calm manager review today?')
  if (list(workforce.alerts).length || list(workforce.wellbeing_alerts).length) prompts.push('What leadership support is visible for staff pressure and reflective practice?')
  if (num(governance.summary?.evidence_gaps)) prompts.push('Which evidence gaps matter most for inspection readiness and child impact?')
  return prompts.slice(0, 6)
}

export function valueFromRecord(record: AnyRecord, keys: string[], fallback: string | number = 'Review'): string | number {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'number') return value
      if (typeof value === 'object') return JSON.stringify(value).slice(0, 120)
      return String(value)
    }
  }
  return fallback
}
