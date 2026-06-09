import { buildBriefRepository } from '@/lib/founder/persistence'
import type { FounderBuildBriefRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { baseTimestamps, nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { BuildBrief, BuildBriefStatus } from './build-brief-types'

let briefs: BuildBrief[] = []

function recordFromBrief(
  brief: BuildBrief,
  source: FounderBuildBriefRecord['source'] = 'staff-team'
): FounderBuildBriefRecord {
  return {
    id: brief.id,
    ...baseTimestamps('founder', source),
    status: brief.status as FounderBuildBriefRecord['status'],
    brief
  }
}

export async function hydrateBuildBriefsFromPersistence(): Promise<void> {
  try {
    const records = await buildBriefRepository.list()
    briefs = records.map((r) => r.brief)
  } catch {
    /* keep local cache */
  }
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
    id: brief.id ?? nextId('brief'),
    status: brief.status ?? 'draft',
    createdAt: brief.createdAt ?? new Date().toISOString()
  }
  briefs = [stored, ...briefs]
  void buildBriefRepository.create(recordFromBrief(stored), {
    actor: 'founder',
    auditSummary: `Build brief created: ${stored.title}`
  }).catch(() => undefined)
  return stored
}

export function updateBuildBriefStatus(id: string, status: BuildBriefStatus): BuildBrief | undefined {
  const index = briefs.findIndex((b) => b.id === id)
  if (index === -1) return undefined
  const updated = { ...briefs[index], status }
  briefs = [...briefs.slice(0, index), updated, ...briefs.slice(index + 1)]
  void buildBriefRepository.changeStatus(id, status as FounderBuildBriefRecord['status'], 'founder', {
    brief: updated
  }).catch(() => undefined)
  return updated
}
