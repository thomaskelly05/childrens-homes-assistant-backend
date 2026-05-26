/**
 * Dev-only tap diagnostics for mobile Safari click forensics.
 * Enabled when NODE_ENV !== "production" or ?tap_debug=1 is in the URL.
 */

export function getTapDebugEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    if (typeof window === 'undefined') return false
    try {
      return new URLSearchParams(window.location.search).get('tap_debug') === '1'
    } catch {
      return false
    }
  }
  if (typeof window !== 'undefined') {
    try {
      if (new URLSearchParams(window.location.search).get('tap_debug') === '1') return true
    } catch {
      /* ignore */
    }
  }
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production'
}

export function describeElement(element: Element | null | undefined): string {
  if (!element) return '<null>'
  const el = element as HTMLElement
  const tag = el.tagName?.toLowerCase() || '?'
  const id = el.id ? `#${el.id}` : ''
  const testId = el.getAttribute?.('data-testid')
  const testIdPart = testId ? `[data-testid=${testId}]` : ''
  const role = el.getAttribute?.('role')
  const rolePart = role ? `[role=${role}]` : ''
  const href = el.getAttribute?.('href')
  const hrefPart = href ? ` href=${href}` : ''
  const disabled = 'disabled' in el && (el as HTMLButtonElement).disabled ? ' [disabled]' : ''
  const pe = typeof window !== 'undefined' ? window.getComputedStyle(el).pointerEvents : ''
  const pePart = pe && pe !== 'auto' ? ` pointer-events=${pe}` : ''
  const classes = el.className && typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 4).join('.') : ''
  const classPart = classes ? `.${classes}` : ''
  return `<${tag}${id}${testIdPart}${rolePart}${hrefPart}${disabled}${pePart}${classPart}>`
}

export function logTapTarget(
  event: { target?: EventTarget | null; currentTarget?: EventTarget | null },
  label?: string
): void {
  if (!getTapDebugEnabled()) return
  const target = event.target instanceof Element ? event.target : null
  const current = event.currentTarget instanceof Element ? event.currentTarget : null
  const prefix = label ? `[tap-debug:${label}]` : '[tap-debug]'
  console.debug(prefix, 'target:', describeElement(target), 'current:', describeElement(current))
}
