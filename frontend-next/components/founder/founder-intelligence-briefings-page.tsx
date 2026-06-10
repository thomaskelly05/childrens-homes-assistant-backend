'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderGet } from '@/lib/founder/api/founder-api-client'
import type { FounderBriefing } from '@/lib/founder/intelligence-centre/intelligence-centre-types'
import { getApprovalItem } from '@/lib/founder/approvals/approval-store'

export function FounderIntelligenceBriefingsPage() {
  const [briefings, setBriefings] = useState<FounderBriefing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void founderGet<{ briefings: FounderBriefing[] }>('/intelligence/briefings')
      .then((result) => {
        if (result.ok) setBriefings(result.data.briefings)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="founder-dashboard min-h-screen" data-testid="founder-intelligence-briefings-page">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Briefings"
          subtitle="Generated executive briefings from the Founder Intelligence Centre."
          showBack
          backHref="/founder/intelligence"
        />

        <FounderSectionCard eyebrow="Library" title="Generated briefings">
          {loading ? (
            <p className="text-sm text-slate-400">Loading briefings…</p>
          ) : briefings.length === 0 ? (
            <p className="text-sm text-slate-400">
              No briefings yet.{' '}
              <Link href="/founder/intelligence" className="text-cyan-300 hover:underline">
                Generate one from the Intelligence Centre
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-4">
              {briefings.map((briefing) => {
                const approval = briefing.approvalId ? getApprovalItem(briefing.approvalId) : undefined
                return (
                  <article
                    key={briefing.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                    data-testid="founder-briefing-row"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-bold text-white">{briefing.title}</h3>
                      <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                        {briefing.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-cyan-300/80">{briefing.type} briefing</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Created {new Date(briefing.generatedAt).toLocaleString('en-GB')}
                    </p>
                    {approval ? (
                      <p className="mt-1 text-xs text-amber-200/90">Approval: {approval.status}</p>
                    ) : null}
                    {briefing.limitations.length > 0 ? (
                      <p className="mt-2 text-xs text-amber-200/80">{briefing.limitations[0]}</p>
                    ) : null}
                    <Link
                      href={`/founder/intelligence/briefings/${briefing.id}`}
                      className="mt-4 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
                    >
                      Open
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
        </FounderSectionCard>
      </div>
    </div>
  )
}
