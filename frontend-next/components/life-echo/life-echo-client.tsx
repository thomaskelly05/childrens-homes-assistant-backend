'use client'

import { useEffect, useState } from 'react'

type LifeEchoPayload = {
  child_id?: string
  timeline?: any
  playback?: any
  child_memory_mode?: any
  therapeutic_insights?: any
  wellbeing_trajectory?: any
  relationship_map?: any
  trigger_heatmap?: any
  message?: string
}

export function LifeEchoClient({ childId }: { childId?: string }) {
  const [payload, setPayload] = useState<LifeEchoPayload | null>(null)
  const [loading, setLoading] = useState(Boolean(childId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!childId) return

    let active = true

    async function loadLifeEcho() {
      try {
        setLoading(true)
        const response = await fetch(`/api/life-echo/experience/${encodeURIComponent(childId)}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' }
        })

        if (!response.ok) throw new Error(`LifeEcho failed to load: ${response.status}`)
        const data = await response.json()
        if (active) setPayload(data)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'LifeEcho could not load.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLifeEcho()

    return () => {
      active = false
    }
  }, [childId])

  if (!childId) {
    return (
      <section className="rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Choose a young person</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">LifeEcho becomes personalised when it is opened from a child journey.</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">Loading LifeEcho</p>
        <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">Preparing emotional memory space...</h2>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-[30px] border border-amber-100 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-700">LifeEcho connection</p>
        <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">Using local experience shell</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">{error}</p>
      </section>
    )
  }

  const eventCount = payload?.timeline?.count || payload?.timeline?.nodes?.length || payload?.playback?.scene_count || 0
  const riskLevel = payload?.therapeutic_insights?.risk?.risk_level || payload?.runtime?.orchestration?.risk?.risk_level || 'not yet available'
  const trajectory = payload?.wellbeing_trajectory?.summary || payload?.runtime?.orchestration?.wellbeing?.trajectory || 'emerging'

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Timeline</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{eventCount}</h2>
        <p className="mt-2 text-sm text-slate-500">emotional memory events connected</p>
      </article>

      <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">Wellbeing</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{trajectory}</h2>
        <p className="mt-2 text-sm text-slate-500">current emotional trajectory</p>
      </article>

      <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">Reflection</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{riskLevel}</h2>
        <p className="mt-2 text-sm text-slate-500">therapeutic support profile</p>
      </article>
    </section>
  )
}
