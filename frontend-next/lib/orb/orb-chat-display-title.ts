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

const PLACEHOLDER_CHAT_TITLES = new Set(['Untitled chat', 'New conversation', 'New chat'])

/** True when a chat has messages or a user-given title worth showing in Recent chats. */
export function isMeaningfulOrbRecentChat(chat: {
  title: string
  messages: readonly unknown[]
}): boolean {
  if (chat.messages.length > 0) return true
  return !PLACEHOLDER_CHAT_TITLES.has(formatOrbChatDisplayTitle(chat.title))
}
