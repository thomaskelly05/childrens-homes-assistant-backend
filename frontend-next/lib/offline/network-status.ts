'use client'

export type NetworkStatusSnapshot = {
  online: boolean
  lastChangedAt: string
  reconnecting: boolean
}

export function currentNetworkStatus(): NetworkStatusSnapshot {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine
  return {
    online,
    lastChangedAt: new Date().toISOString(),
    reconnecting: false
  }
}

export function subscribeToNetworkStatus(listener: (snapshot: NetworkStatusSnapshot) => void) {
  if (typeof window === 'undefined') return () => undefined
  const emit = (online: boolean, reconnecting = false) => listener({ online, reconnecting, lastChangedAt: new Date().toISOString() })
  const onOnline = () => emit(true, true)
  const onOffline = () => emit(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  listener(currentNetworkStatus())
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
