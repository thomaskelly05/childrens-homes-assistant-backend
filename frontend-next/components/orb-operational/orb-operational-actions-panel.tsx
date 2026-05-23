'use client'

import { useState } from 'react'
import Link from 'next/link'

import {
  createOperationalActions,
  type OrbOperationalDraftAction,
  type OrbOperationalRecommendation,
  type OrbOperationalReviewPrompt
} from '@/lib/orb/operational-client'

export function OrbOperationalActionsPanel({
  recommendations,
  draftActions,
  reviewPrompts,
  scope
}: {
  recommendations: OrbOperationalRecommendation[]
  draftActions: OrbOperationalDraftAction[]
  reviewPrompts: OrbOperationalReviewPrompt[]
  scope?: { home_id?: number | null; child_id?: number | null; staff_id?: number | null }
}) {
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleCreateDrafts() {
    if (!draftActions.length || creating) return
    setCreating(true)
    setNotice(null)
    const result = await createOperationalActions(draftActions, scope)
    if (result.source === 'live' && result.data.created_ids?.length) {
      setNotice(`Created ${result.data.created_ids.length} proposed action(s) for manager review.`)
    } else {
      setNotice(result.warning || result.data?.notice || 'Could not persist actions — copy drafts instead.')
    }
    setCreating(false)
  }

  function copyDrafts() {
    const text = draftActions
      .map((d) => `${d.title}\n${d.description}\nPriority: ${d.priority}\nReview: ${d.review_required ? 'yes' : 'no'}`)
      .join('\n\n---\n\n')
    void navigator.clipboard.writeText(text)
    setNotice('Draft actions copied to clipboard.')
  }

  return (
    <section
      className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white"
      data-testid="orb-operational-actions-panel"
    >
      <h2 className="text-lg font-black text-slate-950">Recommendations & draft actions</h2>
      <p className="mt-1 text-xs font-semibold text-slate-500">Suggestions only — manager review where indicated.</p>

      {recommendations.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Recommendations</p>
          {recommendations.map((rec) => (
            <article key={rec.id} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase text-blue-600">{rec.priority} priority</p>
              <h3 className="text-sm font-black text-blue-950">{rec.title}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-blue-900">{rec.summary}</p>
              {rec.review_required ? (
                <p className="mt-1 text-[11px] font-bold text-amber-800">Manager review required</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {draftActions.length ? (
        <div className="mt-4 space-y-2" data-testid="orb-operational-draft-actions">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Draft actions</p>
          {draftActions.map((draft) => (
            <article key={draft.title} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <h3 className="text-sm font-black text-emerald-950">{draft.title}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-emerald-900">{draft.description}</p>
              <p className="mt-1 text-[11px] font-bold text-emerald-800">
                {draft.owner_label} · {draft.due_label}
              </p>
            </article>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void handleCreateDrafts()}
              disabled={creating}
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              data-testid="orb-create-draft-actions"
            >
              Create proposed actions
            </button>
            <button
              type="button"
              onClick={copyDrafts}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
              data-testid="orb-copy-draft-actions"
            >
              Copy drafts
            </button>
            <Link
              href="/intelligence-oversight"
              className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900"
              data-testid="orb-manager-review-link"
            >
              Manager review
            </Link>
          </div>
        </div>
      ) : null}

      {reviewPrompts.length ? (
        <ul className="mt-4 space-y-2 text-xs font-semibold text-amber-900">
          {reviewPrompts.map((prompt) => (
            <li key={prompt.id} className="rounded-xl bg-amber-50 px-3 py-2">
              <span className="font-black">{prompt.title}:</span> {prompt.reason}
            </li>
          ))}
        </ul>
      ) : null}

      {notice ? <p className="mt-3 text-xs font-bold text-slate-600">{notice}</p> : null}
    </section>
  )
}
