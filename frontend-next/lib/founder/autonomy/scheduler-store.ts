import { computeNextRunAt, createDefaultSchedulerTasks, DEFAULT_EMAIL_SETTINGS } from './scheduler-defaults.ts'
import type {
  EmailReportRecord,
  EmailReportSettings,
  SchedulerTask,
  SchedulerTaskRunResult
} from './scheduler-types.ts'

let tasks: SchedulerTask[] = createDefaultSchedulerTasks()
let emailSettings: EmailReportSettings = { ...DEFAULT_EMAIL_SETTINGS }
let emailHistory: EmailReportRecord[] = []
let taskRunHistory: SchedulerTaskRunResult[] = []
let lastSchedulerTick: string | null = null

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function resetDailyCountersIfNeeded(task: SchedulerTask): SchedulerTask {
  const today = todayUtc()
  if (task.lastRunDate !== today) {
    return { ...task, runsToday: 0, lastRunDate: today }
  }
  return task
}

export function getSchedulerTasks(): SchedulerTask[] {
  return tasks.map(resetDailyCountersIfNeeded)
}

export function getSchedulerTask(taskId: string): SchedulerTask | undefined {
  return getSchedulerTasks().find((t) => t.id === taskId)
}

export function updateSchedulerTask(taskId: string, patch: Partial<Pick<SchedulerTask, 'enabled' | 'frequency' | 'maxRunsPerDay' | 'maxScenarioCount'>>): SchedulerTask | undefined {
  const index = tasks.findIndex((t) => t.id === taskId)
  if (index < 0) return undefined

  const updated = { ...tasks[index]!, ...patch }
  if (patch.frequency) {
    updated.nextRunAt = computeNextRunAt(updated.frequency)
  }
  tasks[index] = updated
  return getSchedulerTask(taskId)
}

export function recordTaskRun(taskId: string, result: SchedulerTaskRunResult): void {
  const index = tasks.findIndex((t) => t.id === taskId)
  if (index < 0) return

  const task = resetDailyCountersIfNeeded(tasks[index]!)
  const today = todayUtc()
  tasks[index] = {
    ...task,
    lastRunAt: result.completedAt,
    nextRunAt: computeNextRunAt(task.frequency, new Date(result.completedAt)),
    status:
      result.status === 'failed' || result.status === 'blocked'
        ? 'failed'
        : result.status === 'awaiting_approval'
          ? 'awaiting_approval'
          : result.status === 'redacted'
            ? 'completed'
            : 'completed',
    runsToday: task.runsToday + 1,
    lastRunDate: today,
    createdEvents: [...task.createdEvents, ...result.eventIds],
    auditRecordIds: [...task.auditRecordIds, ...result.auditRecordIds]
  }

  taskRunHistory.unshift(result)
  if (taskRunHistory.length > 200) taskRunHistory = taskRunHistory.slice(0, 200)
}

export function canRunTaskToday(task: SchedulerTask): boolean {
  const current = resetDailyCountersIfNeeded(task)
  return current.runsToday < current.maxRunsPerDay
}

export function getTasksDueForRun(now = new Date()): SchedulerTask[] {
  const nowIso = now.toISOString()
  return getSchedulerTasks().filter(
    (task) =>
      task.enabled &&
      task.frequency.kind !== 'manual_only' &&
      task.nextRunAt !== null &&
      task.nextRunAt <= nowIso &&
      canRunTaskToday(task)
  )
}

function normaliseEmailSettings(settings: EmailReportSettings): EmailReportSettings {
  return {
    ...settings,
    dailyHourLocal: settings.dailyHourLocal ?? settings.dailyHourUtc ?? 16,
    dailyMinuteLocal: settings.dailyMinuteLocal ?? settings.dailyMinuteUtc ?? 0,
    dailyTimezone: settings.dailyTimezone ?? 'Europe/London',
    dailyHourUtc: settings.dailyHourUtc ?? settings.dailyHourLocal ?? 16,
    dailyMinuteUtc: settings.dailyMinuteUtc ?? settings.dailyMinuteLocal ?? 0
  }
}

export function getEmailSettings(): EmailReportSettings {
  return normaliseEmailSettings(emailSettings)
}

export function updateEmailSettings(patch: Partial<EmailReportSettings>): EmailReportSettings {
  emailSettings = normaliseEmailSettings({ ...emailSettings, ...patch })

  const reportTask = tasks.find((t) => t.taskType === 'daily_business_report')
  if (reportTask && emailSettings.businessReportEnabled) {
    const index = tasks.findIndex((t) => t.id === reportTask.id)
    if (index >= 0) {
      tasks[index] = {
        ...tasks[index]!,
        frequency: {
          kind: 'daily_local',
          hour: emailSettings.dailyHourLocal,
          minute: emailSettings.dailyMinuteLocal,
          timezone: emailSettings.dailyTimezone
        },
        metadata: {
          timezone: emailSettings.dailyTimezone,
          localScheduleLabel: `${String(emailSettings.dailyHourLocal).padStart(2, '0')}:${String(emailSettings.dailyMinuteLocal).padStart(2, '0')} ${emailSettings.dailyTimezone}`
        },
        nextRunAt: computeNextRunAt({
          kind: 'daily_local',
          hour: emailSettings.dailyHourLocal,
          minute: emailSettings.dailyMinuteLocal,
          timezone: emailSettings.dailyTimezone
        })
      }
    }
  }

  return getEmailSettings()
}

export function addEmailReportRecord(record: EmailReportRecord): void {
  emailHistory.unshift(record)
  if (emailHistory.length > 100) emailHistory = emailHistory.slice(0, 100)
}

export function getEmailReportHistory(): EmailReportRecord[] {
  return [...emailHistory]
}

export function getLatestEmailReportPreview(): EmailReportRecord | null {
  return emailHistory.find((r) => r.preview != null) ?? emailHistory[0] ?? null
}

export function getTaskRunHistory(limit = 50): SchedulerTaskRunResult[] {
  return taskRunHistory.slice(0, limit)
}

export function setLastSchedulerTick(iso: string): void {
  lastSchedulerTick = iso
}

export function getLastSchedulerTick(): string | null {
  return lastSchedulerTick
}

export function resetSchedulerStore(): void {
  tasks = createDefaultSchedulerTasks()
  emailSettings = { ...DEFAULT_EMAIL_SETTINGS }
  emailHistory = []
  taskRunHistory = []
  lastSchedulerTick = null
}

export function autonomyDefaultsAreSafe(): boolean {
  const liveLlmTasks = getSchedulerTasks().filter((t) => t.taskType.startsWith('live_llm'))
  const allLiveLlmDisabled = liveLlmTasks.every((t) => !t.enabled)
  const syntheticDisabled =
    getSchedulerTasks().find((t) => t.taskType === 'synthetic_scenario_generation')?.enabled === false
  return allLiveLlmDisabled && syntheticDisabled
}
