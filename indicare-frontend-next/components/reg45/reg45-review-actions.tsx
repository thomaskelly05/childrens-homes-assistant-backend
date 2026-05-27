'use client'

import { useState } from 'react'

import {
  applyReg45ReviewAction,
  createReg45ActionsFromGaps,
  exportReg45Review,
  type Reg45QualityReview
} from '@/lib/os-api/reg45-quality-review'

type Props = {
  review: Reg45QualityReview | null
  onUpdated: (review: Reg45QualityReview) => void
}

export function Reg45ReviewActions({ review, onUpdated }: Props) {
  const [message, setMessage] = useState('')
  const [exportText, setExportText] = useState('')

  if (!review?.id) return null

  async function runAction(action: string) {
    const result = await applyReg45ReviewAction(review!.id, action)
    const payload = result.data as {
      review?: Reg45QualityReview
      message?: string
    } | undefined
    if (result.ok && payload?.review) {
      onUpdated(payload.review)
      setMessage(String(payload.message || 'Updated'))
    }
  }

  async function handleExport() {
    const result = await exportReg45Review(review!.id)
    if (result.ok && result.data?.markdown) {
      setExportText(result.data.markdown as string)
      try {
        await navigator.clipboard.writeText(result.data.markdown as string)
        setMessage('Markdown copied')
      } catch {
        setMessage('Export ready — copy from preview')
      }
    }
  }

  async function handleCreateActions() {
    const result = await createReg45ActionsFromGaps(review!.id)
    if (result.data?.warning) setMessage(String(result.data.warning))
    else if (result.data?.action_ids?.length) setMessage(`Created ${result.data.action_ids.length} action(s)`)
    else setMessage('No actions created')
  }

  return (
    <section data-testid="reg45-review-actions" className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void runAction('mark_ready_for_manager_review')}
        className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
      >
        Mark ready for manager review
      </button>
      <button
        type="button"
        onClick={() => void runAction('mark_manager_reviewed')}
        className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-800"
      >
        Mark manager reviewed
      </button>
      <button
        type="button"
        data-testid="reg45-request-ri-review"
        onClick={() => void runAction('request_ri_review')}
        className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-900"
      >
        Request RI review
      </button>
      <button
        type="button"
        onClick={() => void runAction('mark_ri_reviewed')}
        className="rounded-2xl border border-violet-200 px-4 py-2 text-xs font-black text-violet-800"
      >
        Mark RI reviewed
      </button>
      <button
        type="button"
        onClick={() => void runAction('finalise')}
        className="rounded-2xl border border-emerald-200 bg-emerald-600 px-4 py-2 text-xs font-black text-white"
      >
        Finalise draft
      </button>
      <button
        type="button"
        data-testid="reg45-export-markdown"
        onClick={() => void handleExport()}
        className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-800"
      >
        Export / copy markdown
      </button>
      <button
        type="button"
        onClick={() => void handleCreateActions()}
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900"
      >
        Create actions from gaps
      </button>
      {message ? <p className="w-full text-xs font-semibold text-slate-600">{message}</p> : null}
      {exportText ? (
        <pre className="max-h-40 w-full overflow-auto rounded-xl bg-slate-50 p-3 text-[10px]">{exportText.slice(0, 800)}…</pre>
      ) : null}
    </section>
  )
}
