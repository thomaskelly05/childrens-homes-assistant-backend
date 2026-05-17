import { getOsActions } from '@/lib/os-api/actions'
import { getOsEvidence } from '@/lib/os-api/evidence'
import { CareAction, CareActionStatus, EvidenceGap, EvidenceItem } from './types'

function byDateDesc<T>(items: readonly T[], getDate: (item: T) => string) {
  return [...items].sort((left, right) => new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime())
}

const legacyCareActions: CareAction[] = []
const legacyEvidenceItems: EvidenceItem[] = []
const legacyEvidenceGaps: EvidenceGap[] = []

export function getCareActions(): CareAction[] {
  return byDateDesc<CareAction>(legacyCareActions, (action) => action.createdAt)
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
  return byDateDesc<EvidenceItem>(legacyEvidenceItems, (item) => item.createdAt)
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
  return legacyEvidenceGaps
}

export function getEvidenceGapsByYoungPerson(youngPersonId: string): EvidenceGap[] {
  return getEvidenceGaps().filter((gap) => gap.youngPersonId === youngPersonId)
}

export function getEvidenceGapsByRegulation(regulation: string): EvidenceGap[] {
  return getEvidenceGaps().filter((gap) => gap.regulation?.toLowerCase().includes(regulation.toLowerCase()))
}

export async function getLiveCareActions(): Promise<CareAction[]> {
  const result = await getOsActions()
  return byDateDesc<CareAction>(result.data, (action) => action.createdAt)
}

export async function getLiveOpenCareActions(): Promise<CareAction[]> {
  const actions = await getLiveCareActions()
  return actions.filter((action) => action.status !== 'completed')
}

export async function getLiveActionsByYoungPerson(youngPersonId: string): Promise<CareAction[]> {
  const actions = await getLiveCareActions()
  return actions.filter((action) => action.youngPersonId === youngPersonId)
}

export async function getLiveActionsByStatus(status: CareActionStatus): Promise<CareAction[]> {
  const actions = await getLiveCareActions()
  return actions.filter((action) => action.status === status)
}

export async function getLiveActionsByRegulation(regulation: string): Promise<CareAction[]> {
  const actions = await getLiveCareActions()
  return actions.filter((action) => action.regulation?.toLowerCase().includes(regulation.toLowerCase()))
}

export async function getLiveEvidenceItems(): Promise<EvidenceItem[]> {
  const result = await getOsEvidence()
  return byDateDesc<EvidenceItem>(result.data, (item) => item.createdAt)
}

export async function getLiveEvidenceByYoungPerson(youngPersonId: string): Promise<EvidenceItem[]> {
  const items = await getLiveEvidenceItems()
  return items.filter((item) => item.youngPersonId === youngPersonId)
}

export async function getLiveEvidenceByRegulation(regulation: string): Promise<EvidenceItem[]> {
  const items = await getLiveEvidenceItems()
  return items.filter((item) => item.linkedRegulation?.toLowerCase().includes(regulation.toLowerCase()))
}

export async function getLiveEvidenceBySource(sourceType: string, sourceId: string): Promise<EvidenceItem[]> {
  const items = await getLiveEvidenceItems()
  return items.filter((item) => item.sourceType === sourceType && item.sourceId === sourceId)
}

export async function getLiveEvidenceGaps(): Promise<EvidenceGap[]> {
  const items = await getLiveEvidenceItems()
  return items
    .filter((item) => ['draft', 'partial', 'review_required'].includes(item.quality))
    .map((item) => ({
      id: `gap-${item.id}`,
      youngPersonId: item.youngPersonId,
      regulation: item.linkedRegulation || 'Regulation 13',
      description: item.description || item.title,
      severity: item.quality === 'review_required' ? 'high' : 'medium',
      suggestedAction: 'Review and strengthen the linked evidence before relying on it for inspection or care-plan decisions.',
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      createdAt: item.createdAt
    }))
}

export async function getLiveEvidenceGapsByYoungPerson(youngPersonId: string): Promise<EvidenceGap[]> {
  const gaps = await getLiveEvidenceGaps()
  return gaps.filter((gap) => gap.youngPersonId === youngPersonId)
}

export async function getLiveEvidenceGapsByRegulation(regulation: string): Promise<EvidenceGap[]> {
  const gaps = await getLiveEvidenceGaps()
  return gaps.filter((gap) => gap.regulation?.toLowerCase().includes(regulation.toLowerCase()))
}