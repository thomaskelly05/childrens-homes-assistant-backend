'use client'

import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'

import { createRecordQuestion, answerRecordQuestion } from '@/lib/record-intelligence/mock-answerer'
import { RecordQueryScope } from '@/lib/record-intelligence/types'

const defaultPrompts = [
  'What has changed for Jamie this week?',
  'Summarise safeguarding concerns in the last 30 days.',
  'What evidence do we have for emotional wellbeing progress?',
  'What actions are overdue from Reg 44?',
  'Which incidents link to contact anxiety?',
  'Prepare a LAC review summary with citations.',
  'What would Ofsted want to see here?'
]

export function RecordQuestionPanel({
  scope = {},
  title = 'Ask IndiCare about records',
  defaultQuestion = 'Summarise safeguarding concerns in the last 30 days.',
  prompts = defaultPrompts
}: {
  scope?: RecordQueryScope
  title?: string
  defaultQuestion?: string
  prompts?: string[]
}) {
  const [question, setQuestion] = useState(defaultQuestion)
  const [submittedQuestion, setSubmittedQuestion] = useState(defaultQuestion)
  const answer = useMemo(() => answerRecordQuestion(createRecordQuestion(submittedQuestion, scope)), [submittedQuestion, scope])

  return (
    <section className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Deterministic draft</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Answers are generated only from linked chronology records. Review required before use.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-h-[104px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={() => setSubmittedQuestion(question)}
          className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5"
        >
          Generate cited draft answer
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setQuestion(prompt)
              setSubmittedQuestion(prompt)
            }}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Answer</span>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Confidence: {answer.confidence}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{answer.answer}</p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-950">Citations</h3>
          <div className="mt-2 space-y-2">
            {answer.citations.length ? answer.citations.map((citation) => (
              <div key={citation.eventId} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs leading-5 text-slate-600">
                <strong className="block text-slate-900">{citation.label}</strong>
                {citation.excerpt}
              </div>
            )) : <p className="text-sm leading-6 text-slate-500">No citations are available for this answer.</p>}
          </div>
        </div>

        {answer.evidenceGaps.length ? (
          <div>
            <h3 className="text-sm font-black text-slate-950">Evidence gaps</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
              {answer.evidenceGaps.map((gap) => <li key={gap.id} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">{gap.title}</li>)}
            </ul>
          </div>
        ) : null}

        {answer.relatedActions.length ? (
          <div>
            <h3 className="text-sm font-black text-slate-950">Related actions</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
              {answer.relatedActions.map((action) => <li key={action.id} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">{action.title} · {action.status}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
