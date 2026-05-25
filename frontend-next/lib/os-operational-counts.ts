/** Shared AppShell operational counts from operational-feed (avoids duplicate badge API calls). */

import type { RecordingAlertBadgeSummary } from '@/lib/os-api/recording-alerts'

type ShellCounts = {
  recordingOpen: number
  recordingUrgent: number
  feedUnread: number
  updatedAt: number
}

let shellCounts: ShellCounts = {
  recordingOpen: 0,
  recordingUrgent: 0,
  feedUnread: 0,
  updatedAt: 0
}

export function setOperationalShellCounts(partial: Partial<ShellCounts>) {
  shellCounts = { ...shellCounts, ...partial, updatedAt: Date.now() }
}

export function getOperationalShellCounts(): ShellCounts {
  return shellCounts
}

export function badgeFromShellCounts(role?: string): RecordingAlertBadgeSummary | null {
  const { recordingOpen, recordingUrgent } = shellCounts
  if (recordingOpen <= 0 && recordingUrgent <= 0) return null
  const tone: RecordingAlertBadgeSummary['tone'] =
    recordingUrgent > 0 ? 'urgent' : recordingOpen > 0 ? 'attention' : 'neutral'
  return {
    total_open: recordingOpen,
    urgent: recordingUrgent,
    safeguarding: 0,
    review_due: 0,
    changes_requested: 0,
    privacy_flags: 0,
    route: '/record/alerts',
    label:
      recordingUrgent > 0
        ? `${recordingUrgent} urgent recording alert(s)`
        : `${recordingOpen} open recording alert(s)`,
    tone,
    last_check_at: null
  }
}

/** Dedupe marker: nav badge may use feed counts instead of /recording-alerts/badge-summary. */
export const APPSHELL_RECORDING_BADGE_DEDUPE = true
