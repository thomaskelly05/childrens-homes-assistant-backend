'use client'

import { useCallback, useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

import {
  ORB_FEEDBACK_DOWN_REASONS,
  submitStandaloneOrbFeedback,
  type OrbFeedbackDownReason,
  type StandaloneOrbFeedbackRequest
} from '@/lib/orb/standalone-client'

type FeedbackUiState = 'idle' | 'thanks' | 'error' | 'submitting'

export function OrbMessageFeedback({
  payload,
  onRetryWithFeedback
}: {
  payload: StandaloneOrbFeedbackRequest
  onRetryWithFeedback?: (comment: string, reason: OrbFeedbackDownReason) => void
}) {
  const [uiState, setUiState] = useState<FeedbackUiState>('idle')
  const [downOpen, setDownOpen] = useState(false)
  const [reason, setReason] = useState<OrbFeedbackDownReason>('too_generic')
  const [comment, setComment] = useState('')
  const [showRetryOffer, setShowRetryOffer] = useState(false)

  const submit = useCallback(
    async (body: StandaloneOrbFeedbackRequest) => {
      setUiState('submitting')
      try {
        await submitStandaloneOrbFeedback(body)
        setUiState('thanks')
        setDownOpen(false)
        if (body.rating === 'down') {
          setShowRetryOffer(Boolean(onRetryWithFeedback))
        }
      } catch {
        setUiState('error')
      }
    },
    [onRetryWithFeedback]
  )

  const handleThumbsUp = () => {
    void submit({ ...payload, rating: 'up', reason: 'helpful' })
  }

  const handleThumbsDownSubmit = () => {
    void submit({
      ...payload,
      rating: 'down',
      reason,
      comment: comment.trim() || undefined
    })
  }

  if (uiState === 'thanks') {
    return (
      <div className="mt-2 text-xs text-[#64748B]" data-orb-feedback-thanks>
        Thanks — this helps improve ORB.
        {showRetryOffer && onRetryWithFeedback ? (
          <button
            type="button"
            className="ml-2 font-medium text-[#0369A1] underline-offset-2 hover:underline"
            data-orb-feedback-retry-offer
            onClick={() => onRetryWithFeedback(comment.trim(), reason)}
          >
            Would you like ORB to try again using this feedback?
          </button>
        ) : null}
      </div>
    )
  }

  if (uiState === 'error') {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" data-orb-feedback-error>
        <span className="text-[#B91C1C]">Feedback not sent. Try again.</span>
        <button
          type="button"
          className="font-medium text-[#0369A1] underline-offset-2 hover:underline"
          onClick={() => setUiState('idle')}
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2" data-orb-message-feedback>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rate this answer">
        <button
          type="button"
          disabled={uiState === 'submitting'}
          aria-label="Helpful answer"
          title="Helpful"
          data-orb-feedback-up
          onClick={handleThumbsUp}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--orb-line)] bg-white text-[#475569] transition hover:border-[#94A3B8] hover:text-[#0F172A] disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          disabled={uiState === 'submitting'}
          aria-label="Not helpful — tell us what was wrong"
          title="Not helpful"
          data-orb-feedback-down
          onClick={() => setDownOpen((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--orb-line)] bg-white text-[#475569] transition hover:border-[#94A3B8] hover:text-[#0F172A] disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {downOpen ? (
        <div
          className="mt-2 max-w-md rounded-xl border border-[var(--orb-line)] bg-[#F8FAFC] p-3"
          data-orb-feedback-reason-box
        >
          <p className="text-xs font-medium text-[#334155]">What did ORB miss or get wrong?</p>
          <label className="mt-2 block text-[11px] text-[#64748B]" htmlFor={`orb-feedback-reason-${payload.message_id}`}>
            Reason
          </label>
          <select
            id={`orb-feedback-reason-${payload.message_id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value as OrbFeedbackDownReason)}
            className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-xs text-[#0F172A]"
            data-orb-feedback-reason-select
          >
            {ORB_FEEDBACK_DOWN_REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="mt-2 block text-[11px] text-[#64748B]" htmlFor={`orb-feedback-comment-${payload.message_id}`}>
            Optional detail
          </label>
          <textarea
            id={`orb-feedback-comment-${payload.message_id}`}
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did ORB miss or get wrong?"
            className="mt-1 w-full resize-y rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-xs text-[#0F172A]"
            data-orb-feedback-comment
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#0369A1] px-3 py-1.5 text-xs font-medium text-white"
              data-orb-feedback-submit
              disabled={uiState === 'submitting'}
              onClick={handleThumbsDownSubmit}
            >
              Submit feedback
            </button>
            <button
              type="button"
              className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs text-[#475569]"
              onClick={() => setDownOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
