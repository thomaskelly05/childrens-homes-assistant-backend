'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ManagerDailyBriefActions } from '@/components/command-centre/manager-daily-brief-actions'
import { ManagerDailyBriefSectionCard } from '@/components/command-centre/manager-daily-brief-section'
import { getManagerDailyBrief, managerBriefOrbHref, type ManagerDailyBrief } from '@/lib/os-api/manager-daily-brief'

export function ManagerDailyBriefPage() {
  const [brief, setBrief] = useState<ManagerDailyBrief | null>(null)
  const [loading, setLoading] = useState(true)

  function reload() {
    void getManagerDailyBrief().then((result) => {
      setBrief(result.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    reload()
  }, [])

  if (loading || !brief) {
    return (
      <div data-testid="manager-daily-brief-page" className="rounded-2xl border border-slate-100 bg-white p-8 text-sm font-semibold text-slate-600">
        Loading manager daily brief…
      </div>
    )
  }

  return (
    <div data-testid="manager-daily-brief-page" className="space-y-6">
      <header className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Care Hub · Briefing</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{brief.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{brief.opening_summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ManagerDailyBriefActions brief={brief} onReviewed={reload} />
          <Link
            href="/notifications/settings"
            data-testid="manager-daily-brief-notification-settings"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700"
          >
            Notification settings
          </Link>
          <Link
            href="/notifications/settings"
            data-testid="manager-daily-brief-escalation-prompt"
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-violet-800"
          >
            Escalation check available
          </Link>
        </div>
        <p
          className="mt-3 text-xs font-semibold text-violet-900"
          data-testid="manager-daily-brief-escalation-rules-copy"
        >
          Escalation rules protect urgent safeguarding items. Escalations support oversight; they do not make
          safeguarding decisions.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Recording summary</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.recording_summary}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Review summary</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.review_summary}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Safeguarding-sensitive</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.safeguarding_summary}</p>
        </article>
        <article className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4" data-testid="manager-daily-brief-isn-summary">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Safeguarding network</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.isn_summary || 'No ISN summary in scope.'}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4" data-testid="manager-daily-brief-workforce-summary">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Workforce & shift</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.workforce_summary || 'No workforce summary in scope.'}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Actions & handover</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.action_summary}</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.handover_summary}</p>
        </article>
        <article
          className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:col-span-2"
          data-testid="manager-daily-brief-sccif-summary"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
            SCCIF / Quality Standards evidence
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {brief.sccif_summary || 'Open SCCIF alignment for safe evidence map.'}
          </p>
          <Link
            href="/intelligence/sccif"
            data-testid="manager-daily-brief-sccif-link"
            className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-blue-800 underline"
          >
            Open SCCIF alignment
          </Link>
        </article>
        <article
          className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 md:col-span-2"
          data-testid="manager-daily-brief-inspection-readiness"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">
            Inspection evidence preparation
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {(brief as { inspection_readiness_summary?: string }).inspection_readiness_summary ||
              'Reg 44 / Reg 45 evidence support packs — not a grade prediction.'}
          </p>
          <Link
            href="/intelligence/inspection-readiness"
            data-testid="manager-daily-brief-inspection-readiness-link"
            className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-indigo-800 underline"
          >
            Open Inspection evidence preparation
          </Link>
        </article>
        <article
          className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 md:col-span-2"
          data-testid="manager-daily-brief-reg45-review"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
            Reg 45 quality of care review
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {(brief as { reg45_quality_review_summary?: string }).reg45_quality_review_summary ||
              'Draft Reg 45 review workflow — manager review needed.'}
          </p>
          <Link
            href="/intelligence/reg45"
            data-testid="manager-daily-brief-reg45-link"
            className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-violet-800 underline"
          >
            Open Reg 45 review
          </Link>
        </article>
      </section>

      <div className="space-y-4">
        {brief.sections.map((section) => (
          <ManagerDailyBriefSectionCard key={section.id} section={section} />
        ))}
      </div>

      {brief.recommendations.length ? (
        <section data-testid="manager-daily-brief-recommendations" className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Recommendations</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-semibold text-slate-700">
            {brief.recommendations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section data-testid="manager-daily-brief-privacy" className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">Privacy & limitations</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-amber-950">{brief.privacy_notice}</p>
        {brief.limitations.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-amber-900">
            {brief.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-2">
        <Link href={brief.routes.alerts} className="rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-800">
          Recording alerts
        </Link>
        <Link href={brief.routes.reviews} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
          Review queue
        </Link>
        <Link href={brief.routes.governance} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
          Governance
        </Link>
        <Link href={brief.routes.actions} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
          Actions
        </Link>
        <Link href={brief.routes.handover} className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">
          Handover
        </Link>
        <Link
          href={brief.routes.isn || '/safeguarding'}
          data-testid="manager-daily-brief-open-isn"
          className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-violet-800"
        >
          Safeguarding network
        </Link>
        <Link
          href="/intelligence/sccif"
          data-testid="manager-daily-brief-sccif-route"
          className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-800"
        >
          SCCIF alignment
        </Link>
      </section>

      <section data-testid="manager-daily-brief-orb-prompts" className="rounded-[24px] border border-blue-100 bg-blue-50/50 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-800">ORB support</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {brief.orb_prompts.map((prompt) => (
            <Link
              key={prompt.label}
              href={managerBriefOrbHref(prompt.mode, prompt.query)}
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-blue-800 shadow-sm ring-1 ring-blue-100"
            >
              {prompt.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
