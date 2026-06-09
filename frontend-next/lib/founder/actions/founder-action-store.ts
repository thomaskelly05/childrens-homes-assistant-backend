/**
 * Founder Action Store — live intelligence with persisted custom actions and status overrides.
 */

import { actionRepository } from '@/lib/founder/persistence'
import type { FounderActionRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { baseTimestamps } from '@/lib/founder/persistence/repositories/repository-base'
import type { FounderAction, FounderActionCategory, FounderActionPriority, FounderActionStatus } from './founder-action-types'
import { FOUNDER_ACTION_PRIORITY_ORDER } from './founder-action-types'
import { generateFounderActions, createActionFromRecommendation } from './founder-action-generator'

type FounderActionStoreState = {
  actions: FounderAction[]
  initialised: boolean
}

const store: FounderActionStoreState = {
  actions: [],
  initialised: false
}

const statusOverrides = new Map<string, FounderActionStatus>()
const customActions: FounderAction[] = []

export async function hydrateActionsFromPersistence(): Promise<void> {
  try {
    const records = await actionRepository.list()
    for (const record of records) {
      customActions.push(record.action)
      if (record.status) statusOverrides.set(record.action.id, record.status)
    }
  } catch {
    /* intelligence layer remains default */
  }
}

function persistAction(action: FounderAction, status: FounderActionStatus): void {
  const record: FounderActionRecord = {
    id: action.id,
    ...baseTimestamps('founder', 'founder-ui'),
    status,
    action: { ...action, status }
  }
  void actionRepository.create(record, { actor: 'founder', auditSummary: `Action saved: ${action.title}` }).catch(() => undefined)
}

function sortByPriority(actions: FounderAction[]): FounderAction[] {
  return [...actions].sort((a, b) => {
    const priorityDiff = FOUNDER_ACTION_PRIORITY_ORDER[a.priority] - FOUNDER_ACTION_PRIORITY_ORDER[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function applyStatusOverrides(actions: FounderAction[]): FounderAction[] {
  return actions.map((action) => {
    const override = statusOverrides.get(action.id)
    return override ? { ...action, status: override } : action
  })
}

function ensureInitialised(): void {
  if (!store.initialised) {
    store.actions = generateFounderActions()
    store.initialised = true
  }
}

/** Reset store — useful for testing or refreshing intelligence. */
export function resetFounderActionStore(): void {
  store.actions = []
  store.initialised = false
  statusOverrides.clear()
  customActions.length = 0
}

/** Refresh actions from intelligence layer while preserving status overrides. */
export function refreshFounderActions(): FounderAction[] {
  store.actions = generateFounderActions()
  store.initialised = true
  return getFounderActions()
}

/** Get all founder actions with current status. */
export function getFounderActions(): FounderAction[] {
  ensureInitialised()
  const merged = applyStatusOverrides([...store.actions, ...customActions])
  return sortByPriority(merged)
}

/** Update action status by id. */
export function updateFounderActionStatus(id: string, status: FounderActionStatus): FounderAction | null {
  const actions = getFounderActions()
  const action = actions.find((a) => a.id === id)
  if (!action) return null

  statusOverrides.set(id, status)
  const updated = { ...action, status }
  persistAction(updated, status)
  return updated
}

/** Get open (non-done, non-dismissed) actions. */
export function getOpenFounderActions(): FounderAction[] {
  return getFounderActions().filter((a) => a.status !== 'done' && a.status !== 'dismissed')
}

/** Get actions grouped by priority. */
export function getActionsByPriority(): Record<FounderActionPriority, FounderAction[]> {
  const actions = getOpenFounderActions()
  return {
    critical: actions.filter((a) => a.priority === 'critical'),
    high: actions.filter((a) => a.priority === 'high'),
    medium: actions.filter((a) => a.priority === 'medium'),
    low: actions.filter((a) => a.priority === 'low')
  }
}

/** Get actions grouped by category. */
export function getActionsByCategory(): Record<FounderActionCategory, FounderAction[]> {
  const actions = getOpenFounderActions()
  return {
    product: actions.filter((a) => a.category === 'product'),
    growth: actions.filter((a) => a.category === 'growth'),
    ofsted: actions.filter((a) => a.category === 'ofsted'),
    'customer-success': actions.filter((a) => a.category === 'customer-success'),
    'ai-cost': actions.filter((a) => a.category === 'ai-cost'),
    'sector-intelligence': actions.filter((a) => a.category === 'sector-intelligence'),
    'founder-story': actions.filter((a) => a.category === 'founder-story'),
    operations: actions.filter((a) => a.category === 'operations')
  }
}

/** Get top N open actions by priority. */
export function getTopFounderActions(limit = 5): FounderAction[] {
  return getOpenFounderActions().slice(0, limit)
}

/** Get actions linked to a specific agent. */
export function getActionsForAgent(agentId: string): FounderAction[] {
  return getFounderActions().filter((action) => action.linkedAgent === agentId)
}

/** Get completed actions. */
export function getCompletedFounderActions(): FounderAction[] {
  return getFounderActions().filter((a) => a.status === 'done')
}

/** Add a custom action (e.g. from Create Action button). */
export function addFounderAction(input: {
  title: string
  detail: string
  source?: string
  category?: FounderActionCategory
  priority?: FounderActionPriority
  linkedAgent?: Parameters<typeof createActionFromRecommendation>[0]['linkedAgent']
}): FounderAction {
  const action = createActionFromRecommendation({
    title: input.title,
    detail: input.detail,
    source: input.source,
    category: input.category,
    priority: input.priority,
    linkedAgent: input.linkedAgent
  })
  customActions.push(action)
  persistAction(action, action.status)
  return action
}

/** Summary stats for dashboard panel. */
export function getFounderActionSummary() {
  const open = getOpenFounderActions()
  const byPriority = getActionsByPriority()
  return {
    openCount: open.length,
    criticalHighCount: byPriority.critical.length + byPriority.high.length,
    topActions: getTopFounderActions(3)
  }
}
