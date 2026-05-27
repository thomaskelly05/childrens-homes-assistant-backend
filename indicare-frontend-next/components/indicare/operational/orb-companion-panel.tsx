'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic2, Sparkles } from 'lucide-react'

import { CARE_HUB_ORB_PROMPTS, orbPromptHref } from '@/components/command-centre/care-hub-routes'
import { contextSummary } from '@/lib/assistant-core/context'
import { useOperationalContext } from '@/lib/operational/operational-context'

export function OrbCompanionPanel({ className = '' }: { className?: string }) {
  const pathname = usePathname() || '/'
  const {
    assistantContext,
    currentChild,
    currentWorkforceContext,
    currentGovernanceContext,
    operationalRole
  } = useOperationalContext()

  const isCareHub = pathname === '/command-centre' || pathname.startsWith('/command-centre/')
  const workspaceContext = isCareHub ? 'care-hub' : assistantContext.current_workspace_type || 'dashboard'
  const openOrbHref = `/assistant/orb?context=${encodeURIComponent(workspaceContext)}`
  const askPageHref = `/assistant/orb?context=${encodeURIComponent(workspaceContext)}&q=${encodeURIComponent('Help me with this page')}`
  const recordingPromptHref = isCareHub
    ? '/assistant/orb?context=care-hub&mode=record_quality_review'
    : '/assistant/orb?context=recording&mode=record_quality_review'

  const privacyLabel =
    currentChild?.name && operationalRole
      ? `${operationalRole.toUpperCase()} scope · child context available`
      : operationalRole
        ? `${operationalRole.toUpperCase()} scope · home-wide view`
        : 'Permissioned workspace'

  return (
    <section
      data-testid="orb-companion-panel"
      className={`os-context-rail rounded-[24px] border border-slate-200/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 text-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 ring-1 ring-cyan-300/25">
          <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/90">ORB on shift</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.03em] text-white">Connected to this workspace</h2>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
            Connected to this workspace. ORB can help you think, record and review.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Context</p>
        <dl className="grid gap-1.5 text-xs">
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
            <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Active workspace</dt>
            <dd className="mt-0.5 font-black capitalize text-slate-100">
              {assistantContext.current_workspace_type?.replaceAll('_', ' ') || 'Command centre'}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
            <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Child / home</dt>
            <dd className="mt-0.5 font-black text-slate-100">
              {currentChild?.name ? String(currentChild.name) : 'Home-wide — no child locked'}
            </dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
            <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Privacy</dt>
            <dd className="mt-0.5 font-semibold text-slate-300">{privacyLabel}</dd>
          </div>
          {!isCareHub && currentWorkforceContext ? (
            <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/8">
              <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Domains</dt>
              <dd className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-400">{contextSummary(assistantContext)}</dd>
            </div>
          ) : null}
          {currentGovernanceContext ? (
            <p className="text-[10px] font-bold text-emerald-300/90">Governance context active</p>
          ) : null}
        </dl>
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Suggested ORB prompts</p>
        {(isCareHub ? CARE_HUB_ORB_PROMPTS : CARE_HUB_ORB_PROMPTS.slice(0, 3)).map((prompt) => (
          <Link
            key={prompt.label}
            href={orbPromptHref(prompt.query, workspaceContext)}
            className="block rounded-xl bg-white/6 px-3 py-2 text-[11px] font-bold text-slate-200 ring-1 ring-white/8 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {prompt.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Actions</p>
        <Link
          href={openOrbHref}
          className="os-primary-action inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Open ORB with this context
        </Link>
        <Link
          href={askPageHref}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
        >
          <Mic2 className="h-3.5 w-3.5 text-cyan-200" aria-hidden />
          Ask about this page
        </Link>
        <Link
          href={recordingPromptHref}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
        >
          Create a recording prompt
        </Link>
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
