'use client'

import { FlaskConical, Play } from 'lucide-react'
import { useState } from 'react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { ReviewRiskBadge, ReviewStatusBadge } from '@/components/indicare-lab/review-event-badges'
import { createReviewEvent } from '@/lib/indicare-lab/review-events/review-event-storage'
import {
  REVIEW_TASK_TYPE_LABELS,
  type ReviewEvent,
  type ReviewTaskType
} from '@/lib/indicare-lab/review-events/types'

const TASK_TYPE_OPTIONS: ReviewTaskType[] = [
  'chat-response',
  'incident-record',
  'daily-log',
  'handover-note',
  'behaviour-record',
  'safeguarding-record',
  'communication-draft',
  'voice-transcript',
  'dictation-draft'
]

type InternalReviewTestPanelProps = {
  onEventCreated: (event: ReviewEvent) => void
}

export function InternalReviewTestPanel({ onEventCreated }: InternalReviewTestPanelProps) {
  const [taskType, setTaskType] = useState<ReviewTaskType>('incident-record')
  const [prompt, setPrompt] = useState('')
  const [draftAnswer, setDraftAnswer] = useState('')
  const [context, setContext] = useState('')
  const [lastResult, setLastResult] = useState<ReviewEvent | null>(null)
  const [running, setRunning] = useState(false)

  function handleRunReview() {
    if (!draftAnswer.trim()) return
    setRunning(true)

    const result = createReviewEvent({
      source: 'founder-lab-test',
      taskType,
      prompt: prompt.trim() || undefined,
      draftAnswer: draftAnswer.trim(),
      context: context.trim() || undefined,
      isDevelopment: true
    })

    setLastResult(result)
    onEventCreated(result)
    setRunning(false)
  }

  function loadExample(type: 'safeguarding-block' | 'rewrite' | 'pass') {
    if (type === 'safeguarding-block') {
      setTaskType('safeguarding-record')
      setPrompt('Draft a safeguarding record.')
      setDraftAnswer(
        'There was suspected abuse during contact. Staff definitely confirmed neglect and must exclude the child from all future contact.'
      )
      setContext('')
    } else if (type === 'rewrite') {
      setTaskType('behaviour-record')
      setPrompt('Write up a behaviour incident.')
      setDraftAnswer('The child was naughty and manipulative. Staff gave a punishment sanction.')
      setContext('')
    } else {
      setTaskType('daily-log')
      setPrompt('Daily log entry.')
      setDraftAnswer(
        'At 16:30 staff observed Jay in the lounge. Jay said they felt calmer. Staff responded with support and informed the on-call manager.'
      )
      setContext('')
    }
  }

  return (
    <LabSectionCard
      id="review-test"
      eyebrow="Development only"
      title="Run internal review test"
      description="Simulate a runtime Agent Review Board loop locally. Rule-based checks only — no live model calls. Results are added to the review events feed."
      action={
        <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <FlaskConical className="h-4 w-4" aria-hidden />
          Development mode only
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <ExampleButton label="Safeguarding block example" onClick={() => loadExample('safeguarding-block')} />
        <ExampleButton label="Rewrite example" onClick={() => loadExample('rewrite')} />
        <ExampleButton label="Pass example" onClick={() => loadExample('pass')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Task type</span>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as ReviewTaskType)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
            >
              {TASK_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {REVIEW_TASK_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Prompt (optional)</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
              placeholder="What was the user trying to do?"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Draft answer</span>
            <textarea
              value={draftAnswer}
              onChange={(e) => setDraftAnswer(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
              placeholder="Paste the ORB draft answer to review..."
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Context (optional)</span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
              placeholder="Additional context for the review engine..."
            />
          </label>

          <button
            type="button"
            disabled={!draftAnswer.trim() || running}
            onClick={handleRunReview}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Run internal review
          </button>
        </div>

        <div>
          {lastResult ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5" data-testid="review-test-result">
              <div className="flex flex-wrap items-center gap-2">
                <ReviewRiskBadge level={lastResult.riskLevel} />
                <ReviewStatusBadge status={lastResult.status} />
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200">
                  Added to feed
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-300">{lastResult.reasonSummary}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                <span><span className="font-bold text-emerald-300">{lastResult.agentsPassed}</span> passed</span>
                <span><span className="font-bold text-amber-300">{lastResult.agentsRewrote}</span> rewrite</span>
                <span><span className="font-bold text-rose-300">{lastResult.agentsBlocked}</span> blocked</span>
              </div>
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-xs text-slate-400">
                {lastResult.agentResults.map((agent) => (
                  <li key={agent.agent} className="rounded-lg border border-white/5 bg-black/20 p-2">
                    <span className="font-bold text-slate-300">{agent.agentLabel}</span>
                    {' — '}
                    <span className={agent.decision === 'block' ? 'text-rose-300' : agent.decision === 'rewrite' ? 'text-amber-300' : 'text-emerald-300'}>
                      {agent.decision}
                    </span>
                    {agent.flags[0] ? `: ${agent.flags[0]}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
              Run a review test to see structured agent results here.
            </div>
          )}
        </div>
      </div>
    </LabSectionCard>
  )
}

function ExampleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
    >
      {label}
    </button>
  )
}
