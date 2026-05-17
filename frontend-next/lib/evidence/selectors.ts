import { CareAction, CareActionStatus, EvidenceGap, EvidenceItem } from './types'

function byDateDesc<T>(items: T[], getDate: (item: T) => string) {
  return [...items].sort((left, right) => new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime())
}

export function getCareActions(): CareAction[] {
  return byDateDesc([], (action) => action.createdAt)
}

export function getOpenCareActions(): CareAction[] {
  return getCareActions().filter((action) => action.status !== 'completed')
}

export function getActionsByYoungPerson(youngPersonId: string): CareAction[] {
  return getCareActions().filter((action) => action.youngPersonId === youngPersonId)
}

export function getActionsByStatus(status: CareActionStatus): CareAction[] {
  return getCareActions().filter((action) => action.status === status)
}

export function getActionsByRegulation(regulation: string): CareAction[] {
  return getCareActions().filter((action) => action.regulation?.toLowerCase().includes(regulation.toLowerCase()))
}

export function getEvidenceItems(): EvidenceItem[] {
  return byDateDesc([], (item) => item.createdAt)
}

export function getEvidenceByYoungPerson(youngPersonId: string): EvidenceItem[] {
  return getEvidenceItems().filter((item) => item.youngPersonId === youngPersonId)
}

export function getEvidenceByRegulation(regulation: string): EvidenceItem[] {
  return getEvidenceItems().filter((item) => item.linkedRegulation?.toLowerCase().includes(regulation.toLowerCase()))
}

export function getEvidenceBySource(sourceType: string, sourceId: string): EvidenceItem[] {
  return getEvidenceItems().filter((item) => item.sourceType === sourceType && item.sourceId === sourceId)
}

export function getEvidenceGaps(): EvidenceGap[] {
  return []
}

export function getEvidenceGapsByYoungPerson(youngPersonId: string): EvidenceGap[] {
  return getEvidenceGaps().filter((gap) => gap.youngPersonId === youngPersonId)
}

export function getEvidenceGapsByRegulation(regulation: string): EvidenceGap[] {
  return getEvidenceGaps().filter((gap) => gap.regulation?.toLowerCase().includes(regulation.toLowerCase()))
}