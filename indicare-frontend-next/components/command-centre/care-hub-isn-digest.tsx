'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getIsnDigest, isnOrbHref, type IsnDigest } from '@/lib/os-api/isn-notifications'

export function CareHubIsnDigest() {
  const [digest, setDigest] = useState<IsnDigest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getIsnDigest().then((result) => {
      if (!active) return
      setDigest(result.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const unavailable = !digest?.available && !loading

  return (
    <section
      data-testid="care-hub-isn-digest"
      className="rounded-[28px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/30 to-white p-5 shadow-[0_14px_42px_rgba(109,40,217,0.06)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">Safeguarding network</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">Safeguarding network</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
            ISN updates, review needs and safeguarding follow-up.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/intelligence/sccif?judgement=helped_and_protected"
            data-testid="care-hub-isn-sccif-alignment"
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-800"
          >
            Helped / protected alignment
          </Link>
          <Link
            href="/safeguarding"
            data-testid="care-hub-open-isn-safeguarding"
            className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg"
          >
            Open ISN / Safeguarding
          </Link>
          <Link
            href="/record/alerts"
            data-testid="care-hub-isn-recording-alerts"
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-800"
          >
            Open recording alerts
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">Loading safeguarding network summary…</p>
      ) : unavailable ? (
        <p
          className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600"
          data-testid="care-hub-isn-unavailable"
        >
          Safeguarding network summary is unavailable. Use safeguarding records and alerts to check manually.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Urgent" value={digest?.urgent ?? 0} tone="text-rose-800" />
            <Metric label="Review required" value={digest?.review_required ?? 0} tone="text-amber-900" />
            <Metric label="Follow-up due" value={digest?.follow_up_due ?? 0} tone="text-violet-900" />
            <Metric label="Network updates" value={digest?.network_updates ?? 0} tone="text-slate-800" />
          </div>
          {digest?.linked_recording_alerts ? (
            <p className="mt-3 text-sm font-semibold text-slate-700" data-testid="care-hub-isn-linked-recording">
              {digest.linked_recording_alerts} linked safeguarding-sensitive recording alert(s) in scope.
            </p>
          ) : null}
          {digest?.top_items?.length ? (
            <ul className="mt-4 space-y-2">
              {digest.top_items.slice(0, 4).map((item) => (
                <li key={item.id} className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.safe_summary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm font-semibold text-slate-600">No open safeguarding network items in scope.</p>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={isnOrbHref('safeguarding_themes', 'What safeguarding network priorities need review today?')}
          data-testid="care-hub-ask-orb-isn"
          className="rounded-full bg-violet-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white"
        >
          Ask OS ORB
        </Link>
      </div>
      {digest?.privacy_notice ? (
        <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-400">{digest.privacy_notice}</p>
      ) : null}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  )
}
