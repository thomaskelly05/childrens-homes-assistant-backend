/** Canonical ORB Residential visual contract — bump when CSS/render paths change. */
export const ORB_BUILD_VISUAL_VERSION = 'phase-3k-chatgpt-home-message-polish' as const
export const ORB_STYLE_VERSION = 'orb-style-v1' as const
export const ORB_LOGIN_VERSION = 'front-door-v6' as const
export const ORB_AUTH_BUILD_VARIANT = 'orb-auth-product-redesign' as const
export const ORB_VOICE_VERSION = 'living-core-v1' as const
export const ORB_VOICE_CORE_ASSET_WEBP = '/assets/orb/orb-voice-core-base.webp' as const
export const ORB_VOICE_CORE_ASSET_PNG = '/assets/orb/orb-voice-core-base.png' as const
export const ORB_CSS_CONTRACT = 'orb-residential-shell-only' as const

export const ORB_VOICE_COMPONENT_NAME = 'OrbVoiceCompanion' as const
export const ORB_LOGIN_COMPONENT_NAME = 'OrbLoginScreen' as const

/** Canonical ORB layout CSS import chain (single hub: `app/orb/layout.tsx`). */
export const ORB_LAYOUT_CSS_FILES = ['app/orb/orb-residential-shell.css'] as const

/** Archived implementation modules — not imported into /orb. */
export const ORB_IMPLEMENTATION_CSS_FILES = [] as const

/** All ORB CSS files that must parse successfully in CI. */
export const ORB_CANONICAL_CSS_FILES = [
  ...ORB_LAYOUT_CSS_FILES,
  'components/orb-residential/orb-voice.css',
  'components/orb-standalone/orb-voice-studio-layout.css'
] as const

/** Legacy CSS paths that must not be imported into /orb. */
export const ORB_LEGACY_CSS_PATHS = [
  'components/indicare/orb',
  'indicare-ai/orb',
  'orb-voice-companion.css',
  'orb-login-center.css',
  'app/orb/_legacy-ui-archive'
] as const

export const ORB_ARCHIVED_PHASE_CSS_FILES = [
  'app/orb/_legacy-ui-archive/orb-showstopper-phase-1d.css',
  'app/orb/_legacy-ui-archive/orb-showstopper-phase-1d1.css',
  'app/orb/_legacy-ui-archive/orb-theme-lock-phase-1e.css',
  'app/orb/_legacy-ui-archive/orb-flagship-phase-1f.css',
  'app/orb/_legacy-ui-archive/orb-full-viewport-phase-1g.css',
  'app/orb/_legacy-ui-archive/orb-convergence-phase-1h.css'
] as const

/** Voice visual authority — co-located with OrbVoiceCompanion. */
export const ORB_VOICE_CSS_FILE = 'components/orb-residential/orb-voice.css' as const
export const ORB_VOICE_STUDIO_CSS_FILE = 'components/orb-standalone/orb-voice-studio-layout.css' as const
export const ORB_LOGIN_CSS_FILE = 'app/orb/orb-residential-shell.css' as const

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
