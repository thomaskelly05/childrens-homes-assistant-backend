'use client'

import type { HandoverReviewDetail } from '@/lib/os-api/handover-intelligence'

import { HandoverReviewActions } from '@/components/handover/handover-review-actions'
import {
  HandoverFormalStatusBadge,
  HandoverReviewStatusBadge,
  HandoverTimelineBadge
} from '@/components/handover/handover-status-badge'

type Props = {
  detail: HandoverReviewDetail
  onAction: () => void
}

export function HandoverReviewDetailPanel({ detail, onAction }: Props) {
  const { draft } = detail
  const formal = detail.formal_target as {
    can_create_formal_record?: boolean
    formal_status?: string
    warnings?: string[]
  }
  const timeline = detail.timeline_status as { timeline_linked?: boolean; route_hint?: string }

  return (
    <article data-testid="handover-review-detail" className="space-y-5 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">{draft.title}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {draft.shift_label || 'Shift'} · {draft.child_name || (draft.child_id ? `Child ${draft.child_id}` : 'Home scope')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HandoverReviewStatusBadge status={draft.review_status || 'draft'} />
          <HandoverFormalStatusBadge status={draft.formal_status || 'not_attempted'} />
          <HandoverTimelineBadge linked={Boolean(draft.timeline_linked || timeline.timeline_linked)} />
        </div>
      </header>

      <p className="text-xs font-semibold leading-5 text-slate-600">{detail.safety_notice}</p>

      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Handover body</p>
        <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm font-semibold leading-6 text-slate-800 whitespace-pre-wrap">
          {draft.body || 'No free-text narrative yet.'}
        </div>
      </section>

      {draft.sections?.length ? (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Structured sections</p>
          <ul className="mt-2 space-y-2">
            {draft.sections.map((section) => (
              <li key={section.id} className="rounded-xl border border-slate-100 p-3">
                <p className="text-sm font-black text-slate-900">{section.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700 whitespace-pre-wrap">{section.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.linked_intelligence.length ? (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Linked intelligence (safe summaries)</p>
          <ul className="mt-2 space-y-2">
            {detail.linked_intelligence.map((item) => (
              <li key={String(item.id)} className="rounded-xl border border-slate-100 p-3 text-xs font-semibold text-slate-700">
                <span className="font-black text-slate-900">{String(item.title)}</span>
                <p className="mt-1" data-testid="handover-review-safe-summary">
                  {String(item.safe_summary || '')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Review prompts</p>
        <ul className="mt-2 list-disc pl-5 text-xs font-semibold text-slate-600">
          {detail.review_prompts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Formal target status</p>
          <p className="mt-1 text-sm font-semibold text-slate-800" data-testid="handover-formal-target-status">
            Formal record created: {draft.formal_record_created ? 'yes' : 'no'}
          </p>
          <p className="text-xs font-semibold text-slate-600">
            {formal.can_create_formal_record
              ? 'Child-scoped formal record may be created on completion.'
              : 'Formal handover record is not wired yet for this draft.'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Timeline link status</p>
          <p className="mt-1 text-sm font-semibold text-slate-800" data-testid="handover-timeline-link-status">
            Timeline linked: {draft.timeline_linked ? 'yes' : 'no'}
          </p>
          {timeline.route_hint ? (
            <p className="text-xs font-semibold text-slate-600">Hint: {String(timeline.route_hint)}</p>
          ) : null}
        </div>
      </section>

      <HandoverReviewActions
        draftId={draft.id}
        reviewStatus={draft.review_status || 'draft'}
        onAction={onAction}
      />
    </article>
  )
}
