/** Derive display initials from a profile or display name (standalone ORB only). */

export function profileInitialsFromName(name: string | undefined | null): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'You'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const word = parts[0]
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word.toUpperCase()
  }
  const first = parts[0]?.[0] ?? ''
  const last = parts[parts.length - 1]?.[0] ?? ''
  const initials = `${first}${last}`.toUpperCase()
  return initials || 'You'
}
