'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { HandoverReviewDetailPanel } from '@/components/handover/handover-review-detail'
import { HandoverReviewQueue } from '@/components/handover/handover-review-queue'
import {
  getHandoverReviewDetail,
  listHandoverReviewQueue,
  type HandoverReviewDetail,
  type HandoverReviewQueueItem
} from '@/lib/os-api/handover-intelligence'

export default function HandoverReviewsPage() {
  const searchParams = useSearchParams()
  const childIdParam = searchParams.get('child_id')
  const draftParam = searchParams.get('draft_id')

  const [items, setItems] = useState<HandoverReviewQueueItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [activeDraftId, setActiveDraftId] = useState(draftParam || '')
  const [detail, setDetail] = useState<HandoverReviewDetail | null>(null)

  const refresh = useCallback(async () => {
    const params: { child_id?: number } = {}
    if (childIdParam) params.child_id = Number(childIdParam)
    const listed = await listHandoverReviewQueue(params)
    if (listed.ok) {
      setItems(listed.data.items || [])
      setCounts(listed.data.counts || {})
    }
  }, [childIdParam])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (draftParam) setActiveDraftId(draftParam)
  }, [draftParam])

  useEffect(() => {
    if (!activeDraftId) {
      setDetail(null)
      return
    }
    void getHandoverReviewDetail(activeDraftId).then((result) => {
      if (result.ok && result.data) setDetail(result.data)
    })
  }, [activeDraftId])

  const summaryCards = [
    { label: 'Awaiting review', key: 'awaiting_review', tone: 'bg-amber-50 text-amber-900' },
    { label: 'Safeguarding review', key: 'safeguarding_review_required', tone: 'bg-violet-50 text-violet-900' },
    { label: 'Changes requested', key: 'changes_requested', tone: 'bg-rose-50 text-rose-900' },
    { label: 'Approved', key: 'approved', tone: 'bg-emerald-50 text-emerald-900' },
    { label: 'Completed', key: 'completed', tone: 'bg-slate-50 text-slate-800' }
  ]

  return (
    <main data-testid="handover-reviews-page" className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Manager oversight</p>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Handover review</h1>
        <p className="max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Handover review supports safe shift communication. Manager judgement remains required.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/handover" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700">
            Handover workspace
          </Link>
          <Link href="/command-centre" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700">
            Care Hub
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div key={card.key} className={`rounded-2xl border border-slate-100 p-4 ${card.tone}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.12em]">{card.label}</p>
            <p className="mt-1 text-2xl font-black">{counts[card.key] ?? 0}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Review queue</p>
          <HandoverReviewQueue
            items={items}
            activeDraftId={activeDraftId}
            onSelect={(id) => setActiveDraftId(id)}
          />
        </div>
        <div>
          {detail ? (
            <HandoverReviewDetailPanel
              detail={detail}
              onAction={() => {
                void refresh()
                void getHandoverReviewDetail(activeDraftId).then((r) => {
                  if (r.ok && r.data) setDetail(r.data)
                })
              }}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
              Select a handover from the queue to review.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
