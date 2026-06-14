/**
 * Dev-only ORB composer / attachment interaction trace.
 * Enabled when NODE_ENV !== "production" or localStorage indicare.orb.debug.interactions = true
 */

const DEBUG_STORAGE_KEY = 'indicare.orb.debug.interactions'

export type OrbComposerInteractionTraceEvent =
  | 'plus_pointerdown'
  | 'plus_touchstart'
  | 'plus_click'
  | 'plus_pointerup'
  | 'composer_glass_pointerdown'
  | 'composer_focus_handler_fired'
  | 'textarea_focus'
  | 'menu_open_state_changed'
  | 'menu_mounted'
  | 'menu_outside_click'
  | 'file_input_clicked'
  | 'voice_button_clicked'
  | 'voice_pointerdown'
  | 'dictate_start_clicked'
  | 'billing_refresh_clicked'
  | 'settings_save_clicked'

export function isOrbComposerInteractionTraceEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  }
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem(DEBUG_STORAGE_KEY) === 'true') return true
    } catch {
      /* ignore */
    }
  }
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production'
}

export function traceOrbComposerInteraction(
  event: OrbComposerInteractionTraceEvent,
  detail?: Record<string, unknown>
): void {
  if (!isOrbComposerInteractionTraceEnabled()) return
  const payload = {
    at: new Date().toISOString(),
    ms: typeof performance !== 'undefined' ? Math.round(performance.now()) : 0,
    event,
    detail: detail ?? {}
  }
  // eslint-disable-next-line no-console
  console.debug('[orb-composer-interaction]', payload)
}
