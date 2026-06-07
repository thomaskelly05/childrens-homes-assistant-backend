'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
  getOrbFrontendBuildInfo,
  isOrbDebugVisualEnabled,
  ORB_BUILD_VISUAL_VERSION,
  ORB_CANONICAL_CSS_FILES,
  ORB_CSS_CONTRACT,
  ORB_LOGIN_COMPONENT_NAME,
  ORB_LOGIN_VERSION,
  ORB_VOICE_COMPONENT_NAME,
  ORB_VOICE_CSS_FILE,
  ORB_VOICE_STUDIO_CSS_FILE,
  ORB_VOICE_VERSION
} from '@/lib/orb/orb-visual-build'

type VisualDebugSnapshot = {
  voiceComponent: string
  voiceComponentTree: string
  loginComponent: string
  cssContract: string
  buildVisualVersion: string
  voiceVersion: string | null
  loginVersion: string | null
  buildCommit: string
  buildTimestamp: string | null
  legacyGlassOrbVoiceCssPresent: boolean
  legacyGlassOrbMarkInVoice: boolean
  orbSphereInVoice: boolean
  orbPresenceVoiceInStation: boolean
  voiceVisualAuthority: string | null
  heroWidth: number | null
  heroHeight: number | null
  heroOpacity: string | null
  heroTransform: string | null
  heroCollapsed: boolean
  companionCssOverridden: boolean
  loadedStylesheetCount: number
  voiceCssLoaded: boolean
  gateState: string
}

const HERO_MIN_HEIGHT_PX = 200

function detectLegacyGlassOrbVoiceCss(): boolean {
  if (typeof document === 'undefined') return false
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try {
        rules = sheet.cssRules
      } catch {
        continue
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText.includes('.glass-orb-mark--voice')) {
          return true
        }
      }
    }
  } catch {
    return false
  }
  return false
}

function stylesheetHintsVoiceCss(): boolean {
  if (typeof document === 'undefined') return false
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      const href = sheet.href ?? ''
      if (href.includes('orb-voice-companion') || href.includes('orb-voice-studio-layout')) {
        return true
      }
    }
  } catch {
    return false
  }
  return false
}

function buildVoiceComponentTree(): string {
  const station = document.querySelector('[data-orb-voice-station]')
  if (!station) return '(voice panel closed)'

  const parts: string[] = []
  if (document.querySelector('[data-orb-voice-studio]')) {
    parts.push('OrbVoiceStation → OrbVoiceStudioLayout')
  } else if (document.querySelector('[data-orb-voice-mobile]')) {
    parts.push('OrbVoiceStation → OrbVoiceMobileExperience')
  } else {
    parts.push('OrbVoiceStation')
  }

  const companion = document.querySelector('[data-orb-voice-companion][data-orb-voice-companion-size="hero"]')
  if (companion) {
    parts.push('→ OrbVoiceCompanion(hero)')
  }

  return parts.join(' ')
}

function collectVisualDebugSnapshot(): VisualDebugSnapshot {
  const build = getOrbFrontendBuildInfo()
  const html = typeof document !== 'undefined' ? document.documentElement : null

  const voiceHead = document.querySelector('[data-orb-voice-head][data-orb-voice-companion-size="hero"]')
  const voiceCompanion = document.querySelector('[data-orb-voice-companion]')
  const glassOrbInVoice =
    Boolean(document.querySelector('[data-orb-voice-station] [data-glass-orb-mark]')) ||
    Boolean(document.querySelector('[data-orb-voice-mobile] [data-glass-orb-mark]'))
  const orbSphereInVoice = Boolean(
    document.querySelector('[data-orb-voice-station] .orb-sphere, [data-orb-voice-station] .orb-living-sphere')
  )
  const orbPresenceVoiceInStation = Boolean(
    document.querySelector('[data-orb-voice-station] .orb-presence--voice')
  )

  const loginRoot = document.querySelector('[data-orb-login-page]')
  const shell = document.querySelector('[data-orb-shell="true"]')

  let gateState = 'unknown'
  if (loginRoot) gateState = 'unauthenticated'
  else if (shell) gateState = 'ready'

  let heroWidth: number | null = null
  let heroHeight: number | null = null
  let heroOpacity: string | null = null
  let heroTransform: string | null = null
  let heroCollapsed = false
  let companionCssOverridden = false

  if (voiceHead instanceof HTMLElement) {
    const rect = voiceHead.getBoundingClientRect()
    const computed = window.getComputedStyle(voiceHead)
    heroWidth = Math.round(rect.width)
    heroHeight = Math.round(rect.height)
    heroOpacity = computed.opacity
    heroTransform = computed.transform === 'none' ? 'none' : computed.transform
    heroCollapsed = rect.height < HERO_MIN_HEIGHT_PX || rect.width < HERO_MIN_HEIGHT_PX * 0.65

    const explicitHeight = computed.height
    const minHeight = computed.minHeight
    companionCssOverridden =
      heroCollapsed ||
      (explicitHeight !== 'auto' && parseFloat(explicitHeight) < HERO_MIN_HEIGHT_PX) ||
      (minHeight !== '0px' && parseFloat(minHeight) < 120)
  }

  const voiceVisualAuthority = voiceHead?.getAttribute('data-orb-voice-visual-authority') ?? null

  return {
    voiceComponent: voiceCompanion ? ORB_VOICE_COMPONENT_NAME : shell ? '(voice panel closed)' : '—',
    voiceComponentTree: buildVoiceComponentTree(),
    loginComponent: loginRoot ? ORB_LOGIN_COMPONENT_NAME : '—',
    cssContract: html?.dataset.orbCssContract ?? ORB_CSS_CONTRACT,
    buildVisualVersion: html?.dataset.orbBuildVisualVersion ?? ORB_BUILD_VISUAL_VERSION,
    voiceVersion: voiceCompanion?.getAttribute('data-orb-voice-version') ?? null,
    loginVersion: loginRoot?.getAttribute('data-orb-login-version') ?? null,
    buildCommit: build.commit,
    buildTimestamp: build.timestamp,
    legacyGlassOrbVoiceCssPresent: detectLegacyGlassOrbVoiceCss(),
    legacyGlassOrbMarkInVoice: glassOrbInVoice,
    orbSphereInVoice,
    orbPresenceVoiceInStation,
    voiceVisualAuthority,
    heroWidth,
    heroHeight,
    heroOpacity,
    heroTransform,
    heroCollapsed,
    companionCssOverridden,
    loadedStylesheetCount: typeof document !== 'undefined' ? document.styleSheets.length : 0,
    voiceCssLoaded: stylesheetHintsVoiceCss(),
    gateState
  }
}

export function OrbVisualDebugPanel() {
  const searchParams = useSearchParams()
  const enabled = useMemo(() => isOrbDebugVisualEnabled(searchParams), [searchParams])
  const [snapshot, setSnapshot] = useState<VisualDebugSnapshot | null>(null)

  useEffect(() => {
    if (!enabled) return
    const refresh = () => setSnapshot(collectVisualDebugSnapshot())
    refresh()
    const interval = window.setInterval(refresh, 1500)
    return () => window.clearInterval(interval)
  }, [enabled])

  if (!enabled || !snapshot) return null

  return (
    <aside
      className="orb-visual-debug-panel fixed bottom-3 left-3 z-[9999] max-h-[min(80dvh,36rem)] max-w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-slate-500/40 bg-slate-950/92 p-3 font-mono text-[10px] leading-relaxed text-slate-100 shadow-2xl backdrop-blur-md"
      data-orb-visual-debug
      aria-label="ORB visual debug readout"
    >
      <p className="mb-2 text-[11px] font-semibold text-sky-300">ORB visual debug (?debugVisual=1)</p>
      <dl className="space-y-1">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">gate</dt>
          <dd>{snapshot.gateState}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">commit</dt>
          <dd>{snapshot.buildCommit}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">voice tree</dt>
          <dd className="text-right">{snapshot.voiceComponentTree}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">visual authority</dt>
          <dd className={snapshot.voiceVisualAuthority === 'OrbVoiceCompanion' ? 'text-emerald-300' : 'text-amber-300'}>
            {snapshot.voiceVisualAuthority ?? '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">voice version</dt>
          <dd>{snapshot.voiceVersion ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">hero size</dt>
          <dd className={snapshot.heroCollapsed ? 'text-red-300' : 'text-emerald-300'}>
            {snapshot.heroWidth != null && snapshot.heroHeight != null
              ? `${snapshot.heroWidth}×${snapshot.heroHeight}px`
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">hero opacity</dt>
          <dd>{snapshot.heroOpacity ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">hero transform</dt>
          <dd className="max-w-[10rem] truncate text-right">{snapshot.heroTransform ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">hero collapsed</dt>
          <dd className={snapshot.heroCollapsed ? 'text-red-300' : 'text-emerald-300'}>
            {snapshot.heroCollapsed ? 'yes (strip-like)' : 'no'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">OrbSphere in voice</dt>
          <dd className={snapshot.orbSphereInVoice ? 'text-red-300' : 'text-emerald-300'}>
            {snapshot.orbSphereInVoice ? 'yes (legacy)' : 'no'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">CSS overridden</dt>
          <dd className={snapshot.companionCssOverridden ? 'text-amber-300' : 'text-emerald-300'}>
            {snapshot.companionCssOverridden ? 'suspect' : 'ok'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">voice CSS loaded</dt>
          <dd className={snapshot.voiceCssLoaded ? 'text-emerald-300' : 'text-amber-300'}>
            {snapshot.voiceCssLoaded ? 'yes' : 'not detected'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">login component</dt>
          <dd>{snapshot.loginComponent}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">CSS contract</dt>
          <dd>{snapshot.cssContract}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">stylesheets</dt>
          <dd>{snapshot.loadedStylesheetCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">legacy glass-orb CSS</dt>
          <dd className={snapshot.legacyGlassOrbVoiceCssPresent ? 'text-amber-300' : 'text-emerald-300'}>
            {snapshot.legacyGlassOrbVoiceCssPresent ? 'present (scoped)' : 'none affecting voice'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">GlassOrbMark in voice</dt>
          <dd className={snapshot.legacyGlassOrbMarkInVoice ? 'text-red-300' : 'text-emerald-300'}>
            {snapshot.legacyGlassOrbMarkInVoice ? 'yes (unexpected)' : 'no'}
          </dd>
        </div>
      </dl>
      <p className="mt-2 border-t border-slate-700/60 pt-2 text-[9px] text-slate-500">
        voice CSS: {ORB_VOICE_CSS_FILE}, {ORB_VOICE_STUDIO_CSS_FILE}
      </p>
      <p className="mt-1 text-[9px] text-slate-500">
        layout layers: {ORB_CANONICAL_CSS_FILES.length} files via /orb layout + component imports
      </p>
    </aside>
  )
}
