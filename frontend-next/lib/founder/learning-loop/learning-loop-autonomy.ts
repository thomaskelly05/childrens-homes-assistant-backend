import type { LearningLoopAutonomySettings } from './learning-loop-types.ts'

export const DEFAULT_LEARNING_LOOP_AUTONOMY: LearningLoopAutonomySettings = {
  autoDetectWeaknesses: true,
  autoGenerateSyntheticScenarios: false,
  autoRunExperimentalScenarios: false,
  autoCreateLearningProposals: true,
  autoCreateBuildBriefs: false,
  requireFounderApprovalForBenchmarkAddition: true,
  requireFounderApprovalForBrainChanges: true,
  maxGeneratedScenariosPerDay: 20,
  maxExperimentalRunsPerDay: 3
}

let settings: LearningLoopAutonomySettings = { ...DEFAULT_LEARNING_LOOP_AUTONOMY }

const dailyGeneratedCount = new Map<string, number>()
const dailyExperimentalCount = new Map<string, number>()

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getLearningLoopAutonomySettings(): LearningLoopAutonomySettings {
  return { ...settings }
}

export function updateLearningLoopAutonomySettings(
  patch: Partial<LearningLoopAutonomySettings>
): LearningLoopAutonomySettings {
  settings = { ...settings, ...patch }
  return getLearningLoopAutonomySettings()
}

export function resetLearningLoopAutonomySettings(): LearningLoopAutonomySettings {
  settings = { ...DEFAULT_LEARNING_LOOP_AUTONOMY }
  dailyGeneratedCount.clear()
  dailyExperimentalCount.clear()
  return getLearningLoopAutonomySettings()
}

export function canGenerateScenariosToday(requestedCount = 1): boolean {
  const key = todayKey()
  const used = dailyGeneratedCount.get(key) ?? 0
  return used + requestedCount <= settings.maxGeneratedScenariosPerDay
}

export function recordGeneratedScenarios(count: number): void {
  const key = todayKey()
  dailyGeneratedCount.set(key, (dailyGeneratedCount.get(key) ?? 0) + count)
}

export function getGeneratedScenariosToday(): number {
  return dailyGeneratedCount.get(todayKey()) ?? 0
}

export function canRunExperimentalToday(): boolean {
  const key = todayKey()
  const used = dailyExperimentalCount.get(key) ?? 0
  return used < settings.maxExperimentalRunsPerDay
}

export function recordExperimentalRun(): void {
  const key = todayKey()
  dailyExperimentalCount.set(key, (dailyExperimentalCount.get(key) ?? 0) + 1)
}

export function getExperimentalRunsToday(): number {
  return dailyExperimentalCount.get(todayKey()) ?? 0
}

export function autonomyDefaultsAreSafe(): boolean {
  const s = DEFAULT_LEARNING_LOOP_AUTONOMY
  return (
    s.autoDetectWeaknesses === true &&
    s.autoGenerateSyntheticScenarios === false &&
    s.autoRunExperimentalScenarios === false &&
    s.autoCreateBuildBriefs === false &&
    s.requireFounderApprovalForBenchmarkAddition === true &&
    s.requireFounderApprovalForBrainChanges === true
  )
}
