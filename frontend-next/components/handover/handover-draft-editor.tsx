'use client'

import { useCallback, useState } from 'react'

import { HandoverCompletionPanel } from '@/components/handover/handover-completion-panel'
import { DEFAULT_HANDOVER_SECTIONS } from '@/lib/handover/handover-sections'
import type { HandoverDraftSection, HandoverIntelligenceItem } from '@/lib/os-api/handover-intelligence'
import {
  completeHandoverDraft,
  createHandoverDraft,
  markHandoverReadyForReview,
  updateHandoverDraft
} from '@/lib/os-api/handover-intelligence'

type Props = {
  childId?: number
  draftId?: string
  initialTitle?: string
  initialBody?: string
  initialSections?: HandoverDraftSection[]
  initialStatus?: string
  onSaved: (draftId: string) => void
}

export function HandoverDraftEditor({
  childId,
  draftId: initialDraftId,
  initialTitle,
  initialBody,
  initialSections,
  initialStatus = 'draft',
  onSaved
}: Props) {
  const [draftId, setDraftId] = useState(initialDraftId || '')
  const [title, setTitle] = useState(initialTitle || 'Shift handover')
  const [body, setBody] = useState(initialBody || '')
  const [sections, setSections] = useState<HandoverDraftSection[]>(
    initialSections?.length ? initialSections : DEFAULT_HANDOVER_SECTIONS
  )
  const [status, setStatus] = useState(initialStatus)
  const [warnings, setWarnings] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const persist = useCallback(async () => {
    setBusy(true)
    setMessage('')
    const payload = {
      title,
      body,
      sections,
      child_id: childId,
      scope: childId ? 'child' : 'home'
    }
    const result = draftId
      ? await updateHandoverDraft(draftId, payload)
      : await createHandoverDraft(payload)
    setBusy(false)
    if (result.data.draft_id) {
      setDraftId(result.data.draft_id)
      onSaved(result.data.draft_id)
    }
    setWarnings(result.data.warnings || [])
    setStatus(result.data.status || status)
    setMessage(result.ok ? 'Draft saved securely in workspace.' : 'Could not save draft.')
  }, [body, childId, draftId, onSaved, sections, status, title])

  const addFromIntelligence = (item: HandoverIntelligenceItem, sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section
        const hint = `\n• ${item.title}: ${item.safe_summary}`
        return {
          ...section,
          body: section.body.includes(item.id) ? section.body : `${section.body}${hint}`.trim(),
          intelligence_item_ids: [...(section.intelligence_item_ids || []), item.id]
        }
      })
    )
  }

  return (
    <div data-testid="handover-draft-editor" className="space-y-4">
      <HandoverCompletionPanel status={status} warnings={warnings} />

      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Free-text narrative</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold leading-6 text-slate-800"
          placeholder="Overall shift narrative — use structured sections below for detail."
        />
      </label>

      <div className="space-y-3">
        {sections.map((section) => (
          <article key={section.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <h3 className="text-sm font-black text-slate-950">{section.title}</h3>
            {section.prompts?.length ? (
              <p className="mt-1 text-[10px] font-semibold text-slate-500">{section.prompts.join(' · ')}</p>
            ) : null}
            <textarea
              value={section.body}
              onChange={(e) =>
                setSections((prev) =>
                  prev.map((s) => (s.id === section.id ? { ...s, body: e.target.value } : s))
                )
              }
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            />
          </article>
        ))}
      </div>

      {message ? <p className="text-xs font-semibold text-slate-600">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void persist()}
          data-testid="handover-save-draft"
          className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-black text-white disabled:opacity-60"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={busy || !draftId}
          onClick={async () => {
            if (!draftId) return
            setBusy(true)
            const result = await markHandoverReadyForReview(draftId)
            setBusy(false)
            setStatus(result.data.status)
            setWarnings(result.data.warnings || [])
            setMessage('Marked ready for review.')
          }}
          className="rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-black text-amber-900"
        >
          Mark ready for review
        </button>
        <button
          type="button"
          disabled={busy || !draftId}
          onClick={async () => {
            if (!draftId) return
            setBusy(true)
            const result = await completeHandoverDraft(draftId)
            setBusy(false)
            setStatus(result.data.status)
            setWarnings(result.data.warnings || [])
            setMessage('Handover draft completed in workspace.')
          }}
          data-testid="handover-complete"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-black text-emerald-900"
        >
          Complete handover
        </button>
        <button
          type="button"
          disabled={!body && !sections.some((s) => s.body)}
          onClick={() => {
            const text = [
              title,
              body,
              ...sections.map((s) => `${s.title}\n${s.body}`)
            ]
              .filter(Boolean)
              .join('\n\n')
            void navigator.clipboard.writeText(text)
            setMessage('Handover copied to clipboard.')
          }}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700"
        >
          Copy handover
        </button>
      </div>

      <p className="text-[10px] font-semibold text-slate-500">
        Add from intelligence: select items in the panel and use section prompts — only safe summaries are inserted.
      </p>
      <button
        type="button"
        className="hidden"
        data-testid="handover-add-from-intelligence"
        onClick={() =>
          addFromIntelligence(
            {
              id: 'demo',
              title: 'Demo',
              safe_summary: 'Safe summary only.',
              section_type: 'overview',
              priority: 'medium',
              source: 'demo',
              route: '/handover'
            },
            'next-shift'
          )
        }
      />
    </div>
  )
}
