'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  handoverOrbHref,
  getHandoverIntelligence,
  listHandoverReviewQueue
} from '@/lib/os-api/handover-intelligence'

export function CareHubHandover() {
  const [urgent, setUrgent] = useState(0)
  const [safeguarding, setSafeguarding] = useState(0)
  const [alerts, setAlerts] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)

  useEffect(() => {
    void getHandoverIntelligence().then((result) => {
      if (!result.ok) return
      setUrgent(result.data.urgent_count)
      setSafeguarding(result.data.safeguarding_count)
      setAlerts(result.data.recording_alert_count)
    })
    void listHandoverReviewQueue().then((result) => {
      if (!result.ok) return
      const awaiting = result.data.counts?.awaiting_review ?? result.data.items?.length ?? 0
      setReviewCount(Number(awaiting))
    })
  }, [])

  return (
    <section
      data-testid="care-hub-shift-handover"
      className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">Shift handover</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Prepare shift handover</h2>
          <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-slate-600">
            Safe intelligence from recording alerts, ISN, reviews and actions — metadata only in cards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase text-slate-600">
          <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-800">{urgent} urgent</span>
          <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-800">{safeguarding} safeguarding</span>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-800">{alerts} alerts</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/handover"
          data-testid="care-hub-prepare-handover"
          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
        >
          Prepare handover
        </Link>
        {reviewCount > 0 ? (
          <Link
            href="/handover/reviews"
            data-testid="care-hub-handover-reviews"
            className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900"
          >
            Handover reviews ({reviewCount})
          </Link>
        ) : null}
        <Link
          href="/handover/current"
          data-testid="care-hub-open-current-handover"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800"
        >
          Open current handover
        </Link>
        <Link
          href="/intelligence/inspection evidence preparation"
          data-testid="care-hub-handover-inspection evidence preparation"
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
        >
          Inspection evidence preparation
        </Link>
        <Link
          href={handoverOrbHref('manager_daily_brief', 'Help me prepare shift handover for the next team.')}
          data-testid="care-hub-handover-ask-orb"
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
        >
          Ask OS ORB
        </Link>
      </div>
    </section>
  )
}
