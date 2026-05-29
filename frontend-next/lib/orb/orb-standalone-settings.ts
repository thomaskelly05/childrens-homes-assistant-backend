export type OrbStandaloneChatSettings = {
  defaultTemporaryChat: boolean
  showCognitionLabels: boolean
}

export const ORB_STANDALONE_CHAT_SETTINGS_KEY = 'orb-standalone-chat-settings'

export const defaultOrbStandaloneChatSettings: OrbStandaloneChatSettings = {
  defaultTemporaryChat: false,
  showCognitionLabels: true
}

export function loadOrbStandaloneChatSettings(): OrbStandaloneChatSettings {
  if (typeof window === 'undefined') return defaultOrbStandaloneChatSettings
  try {
    const raw = window.localStorage.getItem(ORB_STANDALONE_CHAT_SETTINGS_KEY)
    if (!raw) return defaultOrbStandaloneChatSettings
    const parsed = JSON.parse(raw) as Partial<OrbStandaloneChatSettings>
    return { ...defaultOrbStandaloneChatSettings, ...parsed }
  } catch {
    return defaultOrbStandaloneChatSettings
  }
}

export function saveOrbStandaloneChatSettings(settings: OrbStandaloneChatSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ORB_STANDALONE_CHAT_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}
