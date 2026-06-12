/**
 * Timezone-aware scheduling for founder routines (Europe/London daily reports).
 */

export const DEFAULT_BUSINESS_REPORT_TIMEZONE = 'Europe/London'

export type DailyLocalSchedule = {
  hour: number
  minute: number
  timezone: string
}

export function formatDailyLocalSchedule(schedule: DailyLocalSchedule): string {
  const hh = String(schedule.hour).padStart(2, '0')
  const mm = String(schedule.minute).padStart(2, '0')
  return `${hh}:${mm} ${schedule.timezone}`
}

function zonedParts(date: Date, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts: Record<string, number> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type === 'literal') continue
    parts[part.type] = Number(part.value)
  }
  return parts
}

/** Convert a local wall-clock time in `timeZone` to a UTC Date. */
export function localTimeInZoneToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)

  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = zonedParts(new Date(utcMs), timeZone)
    const dayDelta = day - parts.day
    const minuteDelta = hour * 60 + minute - (parts.hour * 60 + parts.minute)
    const totalDeltaMinutes = dayDelta * 24 * 60 + minuteDelta
    if (totalDeltaMinutes === 0) break
    utcMs -= totalDeltaMinutes * 60 * 1000
  }

  return new Date(utcMs)
}

export function computeNextDailyLocalRunAt(
  schedule: DailyLocalSchedule,
  from = new Date()
): string {
  const parts = zonedParts(from, schedule.timezone)
  let year = parts.year!
  let month = parts.month!
  let day = parts.day!
  const currentMinutes = parts.hour! * 60 + parts.minute!

  const targetMinutes = schedule.hour * 60 + schedule.minute
  if (currentMinutes >= targetMinutes) {
    const nextLocal = localTimeInZoneToUtc(year, month, day + 1, schedule.hour, schedule.minute, schedule.timezone)
    return nextLocal.toISOString()
  }

  return localTimeInZoneToUtc(year, month, day, schedule.hour, schedule.minute, schedule.timezone).toISOString()
}

export function isDailyLocalFrequency(
  frequency: import('./scheduler-types.ts').SchedulerFrequency
): frequency is { kind: 'daily_local'; hour: number; minute: number; timezone: string } {
  return frequency.kind === 'daily_local'
}
