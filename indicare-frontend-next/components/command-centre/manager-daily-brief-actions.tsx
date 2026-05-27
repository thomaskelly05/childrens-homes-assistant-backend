'use client'

import Link from 'next/link'
import { useState } from 'react'

import { managerBriefOrbHref, markManagerDailyBriefReviewed, type ManagerDailyBrief } from '@/lib/os-api/manager-daily-brief'

function briefPlainText(brief: ManagerDailyBrief) {
  const lines = [
    brief.title,
    brief.date,
    '',
    brief.opening_summary,
    '',
    `Recording: ${brief.recording_summary}`,
    `Review: ${brief.review_summary}`,
    `Safeguarding: ${brief.safeguarding_summary}`,
    `Actions: ${brief.action_summary}`,
    `Handover: ${brief.handover_summary}`,
    '',
    'Recommendations:',
    ...brief.recommendations.map((r) => `- ${r}`),
    '',
    brief.privacy_notice
  ]
  return lines.join('\n')
}

export function ManagerDailyBriefActions({ brief, onReviewed }: { brief: ManagerDailyBrief; onReviewed?: () => void }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleMarkReviewed() {
    setBusy(true)
    const result = await markManagerDailyBriefReviewed()
    setMessage(result.data.message || (result.ok ? 'Marked reviewed' : 'Could not mark reviewed'))
    setBusy(false)
    if (result.ok) onReviewed?.()
  }

  async function handleCopy() {
    const text = briefPlainText(brief)
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Brief copied to clipboard.')
    } catch {
      setMessage('Copy failed — select text manually.')
    }
  }

  return (
    <div data-testid="manager-daily-brief-actions" className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="manager-daily-brief-copy"
        onClick={() => void handleCopy()}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 shadow-sm"
      >
        Copy brief
      </button>
      <button
        type="button"
        data-testid="manager-daily-brief-mark-reviewed"
        disabled={busy || brief.reviewed}
        onClick={() => void handleMarkReviewed()}
        className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm disabled:opacity-50"
      >
        {brief.reviewed ? 'Reviewed today' : 'Mark reviewed'}
      </button>
      <Link
        href={managerBriefOrbHref('manager_daily_brief')}
        data-testid="manager-daily-brief-ask-orb"
        className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm"
      >
        Ask OS ORB
      </Link>
      {message ? <p className="w-full text-xs font-semibold text-slate-500">{message}</p> : null}
    </div>
  )
}
