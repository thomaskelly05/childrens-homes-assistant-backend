'use client'

import Link from 'next/link'
import { Mic2, Sparkles } from 'lucide-react'

import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'

import {
  ORB_QUIET_COPILOT_TAGLINE,
  operationalOrbLabel,
  operationalOrbOpenHref,
  operationalOrbPrivacyText,
  operationalOrbPrompts,
  type OperationalOrbScopeType
} from '@/lib/orb/orb-presence-rules'
import type { ScopeOrbMode } from '@/lib/navigation/scope-routes'

const WORKSPACE_LABELS: Record<OperationalOrbScopeType, string> = {
  child: 'Young person',
  home: 'Home',
  record: 'Recording',
  review: 'Recording review',
  archive: 'Archive',
  chronology: 'Chronology',
  lifeecho: 'LifeEcho',
  plan_impacts: 'Plan impacts',
  handover: 'Handover',
  inspection: 'Inspection readiness',
  reg45: 'Reg 45',
  sccif: 'SCCIF',
  generic: 'Operational workspace'
}

export type OperationalOrbRailProps = {
  scopeType: OperationalOrbScopeType
  childName?: string
  homeName?: string
  childId?: string
  homeId?: string
  mode?: ScopeOrbMode | string
  prompts?: Array<{ label: string; href: string }>
  actions?: Array<{ label: string; href: string; testId?: string }>
  privacyLevel?: string
  showOpenButton?: boolean
  compact?: boolean
  testId?: string
  showRecordingPrompt?: boolean
}

export function OperationalOrbRail({
  scopeType,
  childName,
  homeName,
  childId,
  homeId,
  mode,
  prompts: promptsOverride,
  actions,
  privacyLevel,
  showOpenButton = true,
  compact = false,
  testId = 'operational-orb-rail',
  showRecordingPrompt = true
}: OperationalOrbRailProps) {
  const connectionLabel = operationalOrbLabel(scopeType, { childName, homeName })
  const privacy = privacyLevel || operationalOrbPrivacyText(scopeType)
  const prompts =
    promptsOverride ||
    operationalOrbPrompts(scopeType, { childId, homeId }, typeof mode === 'string' ? mode : undefined)
  const openHref = operationalOrbOpenHref(scopeType, { childId, homeId }, typeof mode === 'string' ? mode : undefined)
  const contextEntity =
    scopeType === 'home' || scopeType === 'handover'
      ? homeName || 'Home-wide'
      : childName || (childId ? 'Selected child' : 'Home-wide — no child locked')

  if (compact) {
    return (
      <MobileSafeLink
        href={openHref}
        prefetch={false}
        data-testid={testId}
        tapDebugLabel="workspace-ask-orb"
        className="inline-flex min-h-11 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-black text-white"
      >
        Ask ORB
      </MobileSafeLink>
    )
  }

  return (
    <section
      data-testid={testId}
      data-orb-quiet="true"
      className="os-context-rail rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 p-3.5 text-white shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 ring-1 ring-cyan-300/25">
          <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/90">ORB</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.03em] text-white">{connectionLabel}</h2>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400" data-testid="orb-quiet-copilot-tagline">
            {ORB_QUIET_COPILOT_TAGLINE}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        <span className="text-slate-400">{WORKSPACE_LABELS[scopeType]}</span>
        {' · '}
        {contextEntity}
      </p>

      <div className="mt-3 space-y-1.5">
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-600">When helpful</p>
        {prompts.map((prompt) => (
          <Link
            key={prompt.label}
            href={prompt.href}
            prefetch={false}
            className="block rounded-xl bg-white/6 px-3 py-2 text-[11px] font-bold text-slate-200 ring-1 ring-white/8 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {prompt.label}
          </Link>
        ))}
      </div>

      {actions?.length ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Quick links</p>
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              prefetch={false}
              data-testid={action.testId}
              className="text-center text-xs font-bold text-cyan-200 transition hover:text-cyan-100"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Actions</p>
        {showOpenButton ? (
          <Link
            href={openHref}
            prefetch={false}
            data-testid={`${testId}-open`}
            className="os-primary-action inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Open ORB with this context
          </Link>
        ) : null}
        <Link
          href={`${openHref}${openHref.includes('?') ? '&' : '?'}q=${encodeURIComponent('Help me with this page')}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
        >
          <Mic2 className="h-3.5 w-3.5 text-cyan-200" aria-hidden />
          Ask about this page
        </Link>
        {showRecordingPrompt && (scopeType === 'child' || scopeType === 'home') ? (
          <Link
            href={operationalOrbOpenHref(scopeType, { childId, homeId }, 'record_quality_review')}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
          >
            Create a recording prompt
          </Link>
        ) : null}
        <Link
          href="/assistant/orb?panel=outputs"
          className="inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 transition hover:text-cyan-200"
        >
          View operational outputs
        </Link>
      </div>

      <p className="mt-4 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-[10px] font-semibold leading-5 text-slate-500">
        ORB supports practice. It does not replace safeguarding or manager decisions.
      </p>
    </section>
  )
}
