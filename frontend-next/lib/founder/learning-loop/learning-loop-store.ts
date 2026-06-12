import type {
  BenchmarkScenario,
  DetectedWeakness,
  LearningBuildBrief,
  LearningLoopAuditEntry,
  LearningLoopRecord,
  LearningProposal
} from './learning-loop-types.ts'

let loopCounter = 0
let weaknessCounter = 0
let scenarioCounter = 0
let proposalCounter = 0
let briefCounter = 0
let auditCounter = 0

let loops: LearningLoopRecord[] = []
let weaknesses: DetectedWeakness[] = []
let benchmarkScenarios: BenchmarkScenario[] = []
let proposals: LearningProposal[] = []
let buildBriefs: LearningBuildBrief[] = []
let auditEntries: LearningLoopAuditEntry[] = []

export function nextLoopId(): string {
  loopCounter += 1
  return `learning-loop-${Date.now()}-${loopCounter}`
}

export function nextWeaknessId(): string {
  weaknessCounter += 1
  return `weakness-${Date.now()}-${weaknessCounter}`
}

export function nextScenarioId(): string {
  scenarioCounter += 1
  return `synthetic-scenario-${Date.now()}-${scenarioCounter}`
}

export function nextProposalId(): string {
  proposalCounter += 1
  return `learning-proposal-${Date.now()}-${proposalCounter}`
}

export function nextBuildBriefId(): string {
  briefCounter += 1
  return `learning-build-brief-${Date.now()}-${briefCounter}`
}

export function nextAuditId(): string {
  auditCounter += 1
  return `learning-audit-${Date.now()}-${auditCounter}`
}

export function addLoop(loop: LearningLoopRecord): LearningLoopRecord {
  loops = [loop, ...loops]
  return loop
}

export function updateLoop(id: string, patch: Partial<LearningLoopRecord>): LearningLoopRecord | null {
  const index = loops.findIndex((l) => l.id === id)
  if (index < 0) return null
  loops[index] = { ...loops[index], ...patch }
  return loops[index]
}

export function getLoop(id: string): LearningLoopRecord | undefined {
  return loops.find((l) => l.id === id)
}

export function getAllLoops(): LearningLoopRecord[] {
  return [...loops]
}

export function getActiveLoops(): LearningLoopRecord[] {
  return loops.filter((l) => !['completed', 'rejected'].includes(l.status))
}

export function addWeakness(weakness: DetectedWeakness): DetectedWeakness {
  weaknesses = [weakness, ...weaknesses]
  return weakness
}

export function getAllWeaknesses(): DetectedWeakness[] {
  return [...weaknesses]
}

export function getWeakness(id: string): DetectedWeakness | undefined {
  return weaknesses.find((w) => w.id === id)
}

export function addBenchmarkScenario(scenario: BenchmarkScenario): BenchmarkScenario {
  benchmarkScenarios = [scenario, ...benchmarkScenarios]
  return scenario
}

export function updateBenchmarkScenario(
  id: string,
  patch: Partial<BenchmarkScenario>
): BenchmarkScenario | null {
  const index = benchmarkScenarios.findIndex((s) => s.id === id)
  if (index < 0) return null
  benchmarkScenarios[index] = { ...benchmarkScenarios[index], ...patch }
  return benchmarkScenarios[index]
}

export function getBenchmarkScenario(id: string): BenchmarkScenario | undefined {
  return benchmarkScenarios.find((s) => s.id === id)
}

export function getAllBenchmarkScenarios(): BenchmarkScenario[] {
  return [...benchmarkScenarios]
}

export function addProposal(proposal: LearningProposal): LearningProposal {
  proposals = [proposal, ...proposals]
  return proposal
}

export function updateProposal(id: string, patch: Partial<LearningProposal>): LearningProposal | null {
  const index = proposals.findIndex((p) => p.id === id)
  if (index < 0) return null
  proposals[index] = { ...proposals[index], ...patch }
  return proposals[index]
}

export function getProposal(id: string): LearningProposal | undefined {
  return proposals.find((p) => p.id === id)
}

export function getAllProposals(): LearningProposal[] {
  return [...proposals]
}

export function getPendingProposals(): LearningProposal[] {
  return proposals.filter((p) => p.status === 'awaiting_approval' || p.status === 'draft')
}

export function addBuildBrief(brief: LearningBuildBrief): LearningBuildBrief {
  buildBriefs = [brief, ...buildBriefs]
  return brief
}

export function getBuildBrief(id: string): LearningBuildBrief | undefined {
  return buildBriefs.find((b) => b.id === id)
}

export function getBuildBriefForProposal(proposalId: string): LearningBuildBrief | undefined {
  return buildBriefs.find((b) => b.proposalId === proposalId)
}

export function recordLearningAudit(entry: Omit<LearningLoopAuditEntry, 'id' | 'timestamp'>): LearningLoopAuditEntry {
  const full: LearningLoopAuditEntry = {
    ...entry,
    id: nextAuditId(),
    timestamp: new Date().toISOString()
  }
  auditEntries = [full, ...auditEntries].slice(0, 500)
  return full
}

export function getLearningAuditTrail(loopId?: string): LearningLoopAuditEntry[] {
  if (loopId) return auditEntries.filter((e) => e.loopId === loopId)
  return [...auditEntries]
}

export function clearLearningLoopStore(): void {
  loops = []
  weaknesses = []
  benchmarkScenarios = []
  proposals = []
  buildBriefs = []
  auditEntries = []
  loopCounter = 0
  weaknessCounter = 0
  scenarioCounter = 0
  proposalCounter = 0
  briefCounter = 0
  auditCounter = 0
}
