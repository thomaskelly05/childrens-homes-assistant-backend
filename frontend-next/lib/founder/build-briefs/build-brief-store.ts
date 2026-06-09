import type { BuildBrief, BuildBriefStatus } from './build-brief-types'

let briefs: BuildBrief[] = []
let briefCounter = 0

function nextBriefId(): string {
  briefCounter += 1
  return `brief-${Date.now()}-${briefCounter}`
}

export function getBuildBriefs(): BuildBrief[] {
  return [...briefs]
}

export function getBuildBrief(id: string): BuildBrief | undefined {
  return briefs.find((b) => b.id === id)
}

export function addBuildBrief(
  brief: Omit<BuildBrief, 'id' | 'createdAt' | 'status'> & {
    id?: string
    status?: BuildBriefStatus
    createdAt?: string
  }
): BuildBrief {
  const stored: BuildBrief = {
    ...brief,
    id: brief.id ?? nextBriefId(),
    status: brief.status ?? 'draft',
    createdAt: brief.createdAt ?? new Date().toISOString()
  }
  briefs = [stored, ...briefs]
  return stored
}

export function updateBuildBriefStatus(id: string, status: BuildBriefStatus): BuildBrief | undefined {
  const index = briefs.findIndex((b) => b.id === id)
  if (index === -1) return undefined
  const updated = { ...briefs[index], status }
  briefs = [...briefs.slice(0, index), updated, ...briefs.slice(index + 1)]
  return updated
}
