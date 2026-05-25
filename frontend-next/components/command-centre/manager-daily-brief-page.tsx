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
        <div className="mt-4">
          <ManagerDailyBriefActions brief={brief} onReviewed={reload} />
        </div>
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
        <article className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Actions & handover</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.action_summary}</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{brief.handover_summary}</p>
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
