const PLACEHOLDER_TITLE_RE =
  /^\[(?:NAME|PERSON|CHILD|YP|USER)_\d+\]\.?$/i

const ANONYMISED_TITLE_RE = /^\[[A-Z][A-Z0-9_]*_\d+\]\.?$/i

/** Sidebar-safe chat title — hides broken anonymisation placeholders. */
export function formatOrbChatDisplayTitle(title: string | null | undefined): string {
  const trimmed = String(title ?? '').trim()
  if (!trimmed) return 'Untitled chat'
  if (PLACEHOLDER_TITLE_RE.test(trimmed) || ANONYMISED_TITLE_RE.test(trimmed)) {
    return 'Untitled chat'
  }
  return trimmed
}
