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
  ORB_VOICE_VERSION
} from '@/lib/orb/orb-visual-build'

type VisualDebugSnapshot = {
  voiceComponent: string
  loginComponent: string
  cssContract: string
  buildVisualVersion: string
  voiceVersion: string | null
  loginVersion: string | null
  buildCommit: string
  buildTimestamp: string | null
  legacyGlassOrbVoiceCssPresent: boolean
  legacyGlassOrbMarkInVoice: boolean
  gateState: string
}

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

function collectVisualDebugSnapshot(): VisualDebugSnapshot {
  const build = getOrbFrontendBuildInfo()
  const html = typeof document !== 'undefined' ? document.documentElement : null

  const voiceCompanion = document.querySelector('[data-orb-voice-companion]')
  const glassOrbInVoice =
    Boolean(document.querySelector('[data-orb-voice-station] [data-glass-orb-mark]')) ||
    Boolean(document.querySelector('[data-orb-voice-mobile] [data-glass-orb-mark]'))

  const loginRoot = document.querySelector('[data-orb-login-page]')
  const shell = document.querySelector('[data-orb-shell="true"]')

  let gateState = 'unknown'
  if (loginRoot) gateState = 'unauthenticated'
  else if (shell) gateState = 'ready'

  return {
    voiceComponent: voiceCompanion ? ORB_VOICE_COMPONENT_NAME : shell ? '(voice panel closed)' : '—',
    loginComponent: loginRoot ? ORB_LOGIN_COMPONENT_NAME : '—',
    cssContract: html?.dataset.orbCssContract ?? ORB_CSS_CONTRACT,
    buildVisualVersion: html?.dataset.orbBuildVisualVersion ?? ORB_BUILD_VISUAL_VERSION,
    voiceVersion: voiceCompanion?.getAttribute('data-orb-voice-version') ?? null,
    loginVersion: loginRoot?.getAttribute('data-orb-login-version') ?? null,
    buildCommit: build.commit,
    buildTimestamp: build.timestamp,
    legacyGlassOrbVoiceCssPresent: detectLegacyGlassOrbVoiceCss(),
    legacyGlassOrbMarkInVoice: glassOrbInVoice,
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
      className="orb-visual-debug-panel fixed bottom-3 left-3 z-[9999] max-w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-slate-500/40 bg-slate-950/92 p-3 font-mono text-[10px] leading-relaxed text-slate-100 shadow-2xl backdrop-blur-md"
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
          <dt className="text-slate-400">voice component</dt>
          <dd>{snapshot.voiceComponent}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">login component</dt>
          <dd>{snapshot.loginComponent}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">voice version</dt>
          <dd>{snapshot.voiceVersion ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">login version</dt>
          <dd>{snapshot.loginVersion ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">CSS contract</dt>
          <dd>{snapshot.cssContract}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">build visual</dt>
          <dd>{snapshot.buildVisualVersion}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">commit</dt>
          <dd>{snapshot.buildCommit}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">built</dt>
          <dd>{snapshot.buildTimestamp ?? '—'}</dd>
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
        theme layers: {ORB_CANONICAL_CSS_FILES.length} files via /orb layout
      </p>
    </aside>
  )
}
