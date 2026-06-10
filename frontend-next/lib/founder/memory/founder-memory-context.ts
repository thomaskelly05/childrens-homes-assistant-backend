/**
 * Build FounderStrategicContext from active memory items.
 */

import type { FounderMemoryItem, FounderStrategicContext } from './founder-memory-types'

const EMPTY_CONTEXT: FounderStrategicContext = {
  primaryObjective: '',
  secondaryObjectives: [],
  deferredObjectives: [],
  currentProductFocus: '',
  currentCommercialFocus: '',
  currentRisks: [],
  operatingPrinciples: [],
  importantDecisions: [],
  keyRelationships: [],
  memoryUpdatedAt: '',
  activeMemoryCount: 0
}

function itemText(item: FounderMemoryItem): string {
  return `${item.title}: ${item.content}`
}

function byImportance(a: FounderMemoryItem, b: FounderMemoryItem): number {
  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return order[a.importance] - order[b.importance]
}

function latestUpdatedAt(items: FounderMemoryItem[]): string {
  if (items.length === 0) return ''
  return items.reduce((latest, item) => (item.updatedAt > latest ? item.updatedAt : latest), items[0].updatedAt)
}

/**
 * Aggregate active memory items into strategic context for agents and ORB Founder.
 * Archived and superseded items are excluded.
 */
export function buildFounderStrategicContext(items: FounderMemoryItem[]): FounderStrategicContext {
  const active = items.filter((item) => item.status === 'active')
  if (active.length === 0) return { ...EMPTY_CONTEXT }

  const priorities = active.filter((i) => i.type === 'priority').sort(byImportance)
  const productDirections = active.filter((i) => i.type === 'product-direction').sort(byImportance)
  const deferred = active.filter((i) => i.type === 'deferred-item').sort(byImportance)
  const risks = active.filter((i) => i.type === 'risk').sort(byImportance)
  const principles = active.filter((i) => i.type === 'principle').sort(byImportance)
  const decisions = active.filter((i) => i.type === 'decision').sort(byImportance)
  const relationships = active.filter((i) => i.type === 'relationship-note').sort(byImportance)

  const primaryObjective =
    priorities.find((i) => i.importance === 'critical')?.title ??
    priorities[0]?.title ??
    ''

  const secondaryObjectives = priorities
    .filter((i) => i.title !== primaryObjective)
    .map((i) => itemText(i))
    .slice(0, 6)

  const commercialPriority = priorities.find(
    (i) =>
      i.tags.some((t) => ['commercial', 'pilot', 'partnerships'].includes(t)) ||
      i.title.toLowerCase().includes('commercial') ||
      i.title.toLowerCase().includes('pilot')
  )

  return {
    primaryObjective: primaryObjective ? itemText(priorities.find((i) => i.title === primaryObjective) ?? priorities[0]) : '',
    secondaryObjectives,
    deferredObjectives: deferred.map(itemText),
    currentProductFocus: productDirections[0] ? itemText(productDirections[0]) : '',
    currentCommercialFocus: commercialPriority ? itemText(commercialPriority) : '',
    currentRisks: risks.map(itemText),
    operatingPrinciples: principles.map(itemText),
    importantDecisions: decisions.map(itemText),
    keyRelationships: relationships.map(itemText),
    memoryUpdatedAt: latestUpdatedAt(active),
    activeMemoryCount: active.length
  }
}
