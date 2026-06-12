import { buildAutonomousLoopHealth } from './autonomous-loop-service.ts'
import { SCHEDULER_SAFETY_GATES, type AutonomyOverview } from './scheduler-types'
import {
  getEmailReportHistory,
  getEmailSettings,
  getSchedulerTasks,
  getTaskRunHistory,
  getLastSchedulerTick
} from './scheduler-store'
import { getLiveLlmGateStatus } from './live-llm-gate'
import { runDueSchedulerTasks } from './scheduler-runner'
export { autonomyDefaultsAreSafe } from './scheduler-store'

export function buildAutonomyOverview(): AutonomyOverview {
  return {
    tasks: getSchedulerTasks(),
    liveLlmGate: getLiveLlmGateStatus(),
    emailSettings: getEmailSettings(),
    emailHistory: getEmailReportHistory(),
    safetyGates: [...SCHEDULER_SAFETY_GATES],
    lastSchedulerTick: getLastSchedulerTick(),
    loopHealth: buildAutonomousLoopHealth()
  }
}

export function tickScheduler(now = new Date()) {
  const results = runDueSchedulerTasks(now)
  return {
    tickAt: now.toISOString(),
    tasksRun: results.length,
    results,
    overview: buildAutonomyOverview()
  }
}

export function getSchedulerStatus() {
  return {
    overview: buildAutonomyOverview(),
    recentRuns: getTaskRunHistory(20)
  }
}

