import type { DailyBusinessReportSectionKey, EmailReportSettings, SchedulerTask } from './scheduler-types.ts'
import {
  computeNextDailyLocalRunAt,
  DEFAULT_BUSINESS_REPORT_TIMEZONE,
  formatDailyLocalSchedule
} from './scheduler-timezone.ts'

export const DEFAULT_FOUNDER_EMAIL = 'Thomas.kelly@indicare.co.uk'

export const DEFAULT_BUSINESS_REPORT_SECTIONS: DailyBusinessReportSectionKey[] = [
  'executiveSummary',
  'autonomousIntelligenceLoop',
  'orbInternalBrain',
  'liveLlmGate',
  'qualityLab',
  'prsAndBuild',
  'governance',
  'revenue',
  'finance',
  'relationships',
  'contentBrand',
  'technical',
  'tomApproval'
]

export const DEFAULT_EMAIL_SETTINGS: EmailReportSettings = {
  recipient: DEFAULT_FOUNDER_EMAIL,
  dailyEnabled: true,
  weeklyEnabled: true,
  dailyHourUtc: 16,
  dailyMinuteUtc: 0,
  dailyHourLocal: 16,
  dailyMinuteLocal: 0,
  dailyTimezone: DEFAULT_BUSINESS_REPORT_TIMEZONE,
  weeklyDayOfWeek: 1,
  weeklyHourUtc: 8,
  provider: 'dry_run',
  dryRun: true,
  businessReportEnabled: true,
  includedSections: [...DEFAULT_BUSINESS_REPORT_SECTIONS],
  founderConfirmedSend: false
}

function taskId(type: string): string {
  return `scheduler-${type}`
}

function computeNextRunAt(frequency: SchedulerTask['frequency'], from = new Date()): string | null {
  if (frequency.kind === 'manual_only') return null

  const next = new Date(from)

  if (frequency.kind === 'interval') {
    next.setTime(next.getTime() + frequency.hours * 60 * 60 * 1000)
    return next.toISOString()
  }

  if (frequency.kind === 'interval_minutes') {
    next.setTime(next.getTime() + frequency.minutes * 60 * 1000)
    return next.toISOString()
  }

  if (frequency.kind === 'daily') {
    next.setUTCHours(frequency.hourUtc, frequency.minuteUtc ?? 0, 0, 0)
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1)
    return next.toISOString()
  }

  if (frequency.kind === 'daily_local') {
    return computeNextDailyLocalRunAt(
      { hour: frequency.hour, minute: frequency.minute, timezone: frequency.timezone },
      from
    )
  }

  if (frequency.kind === 'weekly') {
    const currentDay = next.getUTCDay()
    let daysUntil = (frequency.dayOfWeek - currentDay + 7) % 7
    next.setUTCHours(frequency.hourUtc, frequency.minuteUtc ?? 0, 0, 0)
    if (daysUntil === 0 && next <= from) daysUntil = 7
    next.setUTCDate(next.getUTCDate() + daysUntil)
    return next.toISOString()
  }

  return null
}

function baseTask(
  partial: Omit<SchedulerTask, 'nextRunAt' | 'runsToday' | 'lastRunDate'>
): SchedulerTask {
  return {
    ...partial,
    nextRunAt: computeNextRunAt(partial.frequency),
    runsToday: 0,
    lastRunDate: null
  }
}

export function createDefaultSchedulerTasks(): SchedulerTask[] {
  return [
    baseTask({
      id: taskId('internal_brain_rotating_micro_check'),
      name: 'Internal Brain Rotating Micro-Check',
      taskType: 'internal_brain_rotating_micro_check',
      enabled: true,
      frequency: { kind: 'interval_minutes', minutes: 15 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 96,
      maxScenarioCount: 10,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('internal_brain_focused_check'),
      name: 'Internal Brain Focused Weak-Area Check',
      taskType: 'internal_brain_focused_check',
      enabled: true,
      frequency: { kind: 'interval', hours: 1 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 24,
      maxScenarioCount: 30,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('internal_brain_quick_check'),
      name: 'Internal Brain Quick Safety Check',
      taskType: 'internal_brain_quick_check',
      enabled: false,
      frequency: { kind: 'interval', hours: 3 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 8,
      maxScenarioCount: 20,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('internal_brain_full'),
      name: 'Internal Brain Full Benchmark',
      taskType: 'internal_brain_full',
      enabled: true,
      frequency: { kind: 'daily', hourUtc: 2, minuteUtc: 0 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 100,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('coverage_gap_scan'),
      name: 'Coverage Gap Scan',
      taskType: 'coverage_gap_scan',
      enabled: true,
      frequency: { kind: 'daily', hourUtc: 2, minuteUtc: 30 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('learning_proposal_creation'),
      name: 'Learning Proposal Creation',
      taskType: 'learning_proposal_creation',
      enabled: true,
      frequency: { kind: 'daily', hourUtc: 3, minuteUtc: 0 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('daily_business_report'),
      name: 'IndiCare Intelligence Daily Business Report',
      taskType: 'daily_business_report',
      enabled: true,
      frequency: {
        kind: 'daily_local',
        hour: DEFAULT_EMAIL_SETTINGS.dailyHourLocal,
        minute: DEFAULT_EMAIL_SETTINGS.dailyMinuteLocal,
        timezone: DEFAULT_EMAIL_SETTINGS.dailyTimezone
      },
      metadata: {
        timezone: DEFAULT_EMAIL_SETTINGS.dailyTimezone,
        localScheduleLabel: formatDailyLocalSchedule({
          hour: DEFAULT_EMAIL_SETTINGS.dailyHourLocal,
          minute: DEFAULT_EMAIL_SETTINGS.dailyMinuteLocal,
          timezone: DEFAULT_EMAIL_SETTINGS.dailyTimezone
        })
      },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'report_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('daily_founder_email_report'),
      name: 'Daily Founder Email Report (legacy)',
      taskType: 'daily_founder_email_report',
      enabled: false,
      frequency: { kind: 'daily', hourUtc: 16, minuteUtc: 0 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'report_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('finance_snapshot'),
      name: 'Daily Finance Snapshot',
      taskType: 'finance_snapshot',
      enabled: true,
      frequency: { kind: 'daily', hourUtc: 8, minuteUtc: 0 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'report_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('revenue_pipeline_review'),
      name: 'Weekly Revenue Pipeline Review',
      taskType: 'revenue_pipeline_review',
      enabled: true,
      frequency: { kind: 'weekly', dayOfWeek: 1, hourUtc: 8, minuteUtc: 0 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'report_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('synthetic_scenario_generation'),
      name: 'Synthetic Scenario Generation',
      taskType: 'synthetic_scenario_generation',
      enabled: false,
      frequency: { kind: 'manual_only' },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: true,
      maxRunsPerDay: 2,
      maxScenarioCount: 50,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('internal_brain_adversarial'),
      name: 'Internal Brain Adversarial Pack',
      taskType: 'internal_brain_adversarial',
      enabled: false,
      frequency: { kind: 'manual_only' },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 2,
      maxScenarioCount: 50,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('internal_brain_high_risk'),
      name: 'Internal Brain High-Risk Pack',
      taskType: 'internal_brain_high_risk',
      enabled: false,
      frequency: { kind: 'manual_only' },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 2,
      maxScenarioCount: 50,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('live_llm_adversarial_recommendation'),
      name: 'Live LLM Adversarial Recommendation',
      taskType: 'live_llm_adversarial_recommendation',
      enabled: false,
      frequency: { kind: 'manual_only' },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'recommendation_only',
      approvalRequired: true,
      maxRunsPerDay: 1,
      maxScenarioCount: 50,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('live_llm_high_risk_recommendation'),
      name: 'Live LLM High-Risk Recommendation',
      taskType: 'live_llm_high_risk_recommendation',
      enabled: false,
      frequency: { kind: 'manual_only' },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'recommendation_only',
      approvalRequired: true,
      maxRunsPerDay: 1,
      maxScenarioCount: 50,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('live_llm_gold_recommendation'),
      name: 'Live LLM GOLD Recommendation',
      taskType: 'live_llm_gold_recommendation',
      enabled: false,
      frequency: { kind: 'manual_only' },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'recommendation_only',
      approvalRequired: true,
      maxRunsPerDay: 1,
      maxScenarioCount: 20,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('weekly_founder_email_report'),
      name: 'Weekly Founder Email Report',
      taskType: 'weekly_founder_email_report',
      enabled: true,
      frequency: { kind: 'weekly', dayOfWeek: 1, hourUtc: 8, minuteUtc: 0 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'report_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('benchmark_bank_review'),
      name: 'Benchmark Bank Review',
      taskType: 'benchmark_bank_review',
      enabled: false,
      frequency: { kind: 'manual_only' },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: true,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    }),
    baseTask({
      id: taskId('weekly_internal_brain_residential_audit'),
      name: 'Weekly Deep Residential Children\'s Home Audit',
      taskType: 'weekly_internal_brain_residential_audit',
      enabled: true,
      frequency: { kind: 'weekly', dayOfWeek: 0, hourUtc: 3, minuteUtc: 0 },
      lastRunAt: null,
      status: 'idle',
      allowedMode: 'internal_brain_only',
      approvalRequired: false,
      maxRunsPerDay: 1,
      maxScenarioCount: 0,
      createdEvents: [],
      auditRecordIds: []
    })
  ]
}

export { computeNextRunAt }
