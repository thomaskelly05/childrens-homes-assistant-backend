'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getManagerDailyBrief, managerBriefOrbHref, type ManagerDailyBrief } from '@/lib/os-api/manager-daily-brief'

export function CareHubManagerDailyBrief() {
  const [brief, setBrief] = useState<ManagerDailyBrief | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getManagerDailyBrief().then((result) => {
      if (!active) return
      setBrief(result.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const recording = brief?.sections.find((s) => s.id === 'recording_alerts')
  const review = brief?.sections.find((s) => s.id === 'reviews')
  const safeguarding = brief?.sections.find((s) => s.id === 'safeguarding')
  const isnNetwork = brief?.sections.find((s) => s.id === 'isn_safeguarding_network')
  const actions = brief?.sections.find((s) => s.id === 'actions')
  const handover = brief?.sections.find((s) => s.id === 'handover')
  const workforce = brief?.sections.find((s) => s.id === 'workforce_shift')

  return (
    <section
      data-testid="care-hub-manager-daily-brief"
      className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-white p-5 shadow-[0_14px_42px_rgba(37,99,235,0.08)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Manager daily brief</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">Manager daily brief</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
            Recording, review and safeguarding-sensitive follow-up for today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/command-centre/briefing"
            data-testid="care-hub-open-full-brief"
            className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg"
          >
            Open full brief
          </Link>
          <Link
            href="/record/alerts"
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-800"
          >
            Open alerts
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">Loading brief…</p>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">{brief?.opening_summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[recording, review, safeguarding, isnNetwork, workforce, actions, handover].filter(Boolean).map((section) => (
              <article key={section!.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{section!.title}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{section!.summary}</p>
                {section!.action_label ? (
                  <Link href={section!.route} className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                    {section!.action_label}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/record/reviews" className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
              Review queue
            </Link>
            <Link
              href={managerBriefOrbHref('manager_daily_brief', 'Summarise manager daily brief priorities.')}
              data-testid="care-hub-ask-orb-daily-brief"
              className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white"
            >
              Ask OS ORB
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
