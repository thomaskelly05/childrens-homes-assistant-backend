export type OrbClipboardResult = 'copied' | 'failed'

export async function copyTextToClipboard(text: string): Promise<OrbClipboardResult> {
  const trimmed = text.trim()
  if (!trimmed) return 'failed'
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(trimmed)
      return 'copied'
    }
    const area = document.createElement('textarea')
    area.value = trimmed
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok ? 'copied' : 'failed'
  } catch {
    return 'failed'
  }
}
