'use client'

export type OperationalRefreshEvent =
  | 'record:saved'
  | 'record:updated'
  | 'actions:refresh'
  | 'assistant-context:refresh'
  | 'chronology:refresh'
  | 'command-centre:refresh'
  | 'documents:refresh'
  | 'evidence:refresh'
  | 'inspection:refresh'
  | 'safeguarding:refresh'

type Listener = (detail?: unknown) => void

const listeners = new Map<OperationalRefreshEvent, Set<Listener>>()

export function emitOperationalEvent(type: OperationalRefreshEvent, detail?: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`indicare:${type}`, { detail }))
  }
  listeners.get(type)?.forEach((listener) => listener(detail))
}

export function subscribeOperationalEvent(type: OperationalRefreshEvent, listener: Listener) {
  const set = listeners.get(type) || new Set<Listener>()
  set.add(listener)
  listeners.set(type, set)
  return () => {
    set.delete(listener)
    if (!set.size) listeners.delete(type)
  }
}

export function emitRecordRefresh(events: OperationalRefreshEvent[], detail?: unknown) {
  events.forEach((event) => emitOperationalEvent(event, detail))
}
