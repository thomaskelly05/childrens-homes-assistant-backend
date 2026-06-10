'use client'

import { useCallback, useState } from 'react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import {
  approveItem,
  getApprovalItems,
  getApprovalTypeLabel,
  getPendingApprovals,
  rejectApprovalItem,
  requestChanges
} from '@/lib/founder/approvals'

export function FounderApprovalsPage() {
  const [, setTick] = useState(0)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const pending = getPendingApprovals()
  const all = getApprovalItems()

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Approval Centre"
          subtitle="Review anything before it goes external or affects the platform. No external action can happen unless approved."
        />

        {all.length === 0 ? (
          <div className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-12 text-center">
            <p className="text-lg font-bold text-slate-300">No approvals waiting.</p>
            <p className="mt-2 text-sm text-slate-500">External-facing drafts from staff agents will appear here for your review.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 ? (
              <FounderSectionCard eyebrow="Pending" title={`${pending.length} awaiting review`}>
                <div className="space-y-4">
                  {pending.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                            {getApprovalTypeLabel(item.type)}
                          </span>
                          <h3 className="mt-2 text-lg font-bold text-white">{item.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Requested by {item.requestedByAgent} · Risk: {item.riskLevel}
                          </p>
                        </div>
                        <span className="text-xs font-bold uppercase text-amber-300">{item.status}</span>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.content}</p>
                      <p className="mt-3 text-xs text-slate-500">Safety check: {item.safetyCheck}</p>
                      <label className="mt-4 block text-xs font-bold uppercase text-slate-500">
                        Founder note (optional)
                        <textarea
                          value={notes[item.id] ?? ''}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
                          placeholder="Note for audit trail — not sent externally"
                        />
                      </label>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            approveItem(item.id, notes[item.id])
                            refresh()
                          }}
                          className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            requestChanges(item.id, notes[item.id])
                            refresh()
                          }}
                          className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200"
                        >
                          Needs Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            rejectApprovalItem(item.id, notes[item.id])
                            refresh()
                          }}
                          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200"
                        >
                          Reject
                        </button>
                        <SaveToFounderMemoryButton
                          type="decision"
                          title={`Approval decision: ${item.title}`}
                          content={`${item.title}\n\n${item.content}`}
                          tags={['approval', item.type]}
                          linkedEntityId={item.id}
                          linkedEntityType="approval"
                          source="approval-centre"
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </FounderSectionCard>
            ) : null}

            <FounderSectionCard eyebrow="History" title="All approval items">
              <div className="space-y-3">
                {all.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
                    <div>
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="text-xs text-slate-500">{getApprovalTypeLabel(item.type)} · {item.requestedByAgent}</p>
                    </div>
                    <span
                      className={
                        item.status === 'approved'
                          ? 'text-emerald-300'
                          : item.status === 'rejected'
                            ? 'text-rose-300'
                            : 'text-amber-300'
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </FounderSectionCard>
          </>
        )}
      </div>
    </div>
  )
}
