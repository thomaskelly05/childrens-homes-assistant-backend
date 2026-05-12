export type RuntimeEvent = {
  type: string
  payload?: unknown
}

type Listener = (event: RuntimeEvent) => void

const listeners = new Set<Listener>()

export function subscribe(listener: Listener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function publish(event: RuntimeEvent) {
  listeners.forEach((listener) => listener(event))
}
