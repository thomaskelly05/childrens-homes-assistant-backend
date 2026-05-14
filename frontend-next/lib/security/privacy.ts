const SENSITIVE_PREFIXES = [
  'indicare-',
  'indicare:',
  'indicare.',
  'orb:',
  'assistant:',
  'openai-realtime'
]

export function redactErrorMessage(message: unknown) {
  const text = message instanceof Error ? message.message : String(message || '')
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(/\b(?:bearer|token|session)\s+[A-Za-z0-9._\-+/=]{12,}\b/gi, '[redacted token]')
    .slice(0, 300)
}

export function isSensitiveStorageKey(key: string) {
  return SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix))
}

export function clearSensitiveBrowserState() {
  if (typeof window === 'undefined') return

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean) as string[]
    for (const key of keys) {
      if (isSensitiveStorageKey(key)) storage.removeItem(key)
    }
  }

  if ('caches' in window) {
    void window.caches.keys().then((keys) => {
      for (const key of keys) {
        if (key.startsWith('indicare') || key.includes('orb') || key.includes('assistant')) {
          void window.caches.delete(key)
        }
      }
    }).catch(() => undefined)
  }
}

export function suppressProductionConsole() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return
  const noop = () => undefined
  window.console.debug = noop
  window.console.info = noop
  window.console.log = noop
}
