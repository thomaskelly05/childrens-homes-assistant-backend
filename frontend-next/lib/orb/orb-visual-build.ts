/** Canonical ORB Residential visual contract — bump when CSS/render paths change. */
export const ORB_BUILD_VISUAL_VERSION = 'premium-final' as const
export const ORB_LOGIN_VERSION = 'front-door-v4' as const
export const ORB_VOICE_VERSION = 'living-head-v4' as const
export const ORB_CSS_CONTRACT = 'premium-viewport-final' as const

export const ORB_VOICE_COMPONENT_NAME = 'OrbVoiceCompanion' as const
export const ORB_LOGIN_COMPONENT_NAME = 'OrbLoginScreen' as const

/** Canonical ORB theme CSS import chain (single hub: `app/orb/layout.tsx`). */
export const ORB_CANONICAL_CSS_FILES = [
  'app/orb/orb-desktop.css',
  'app/orb/orb-premium-tokens.css',
  'components/orb/premium/orb-premium-v2.css',
  'components/orb/premium/orb-premium-studio-v3.css',
  'app/orb/orb-dictate-studio-polish.css',
  'app/orb/orb-premium-layout-pass.css',
  'app/orb/orb-brand-asset.css',
  'app/orb/orb-light-layer-fix.css',
  'app/orb/orb-login-center.css',
  'app/orb/orb-mobile.css',
  'components/orb-residential/orb-voice-companion.css',
  'components/orb-standalone/orb-voice-studio-layout.css'
] as const

/** Voice visual authority — co-located with OrbVoiceCompanion. */
export const ORB_VOICE_CSS_FILE = 'components/orb-residential/orb-voice-companion.css' as const
export const ORB_VOICE_STUDIO_CSS_FILE = 'components/orb-standalone/orb-voice-studio-layout.css' as const

export function getOrbFrontendBuildInfo(): { commit: string; timestamp: string | null } {
  const commit =
    process.env.NEXT_PUBLIC_ORB_GIT_COMMIT?.slice(0, 7) ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    'local'
  const timestamp = process.env.NEXT_PUBLIC_ORB_BUILD_TIMESTAMP ?? null
  return { commit, timestamp }
}

export function isOrbDebugVisualEnabled(search: string | URLSearchParams | null | undefined): boolean {
  if (!search) return false
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  return params.get('debugVisual') === '1'
}
