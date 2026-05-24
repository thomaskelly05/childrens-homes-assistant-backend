'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'

import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'
import {
  buildGovernanceSummaryText,
  operationalOrbGovernanceHref,
  type RecordingGovernanceDashboard
} from '@/lib/os-api/recording-governance'

export function RecordingGovernanceActions({
  dashboard,
  childIdFilter
}: {
  dashboard: RecordingGovernanceDashboard | null
  childIdFilter?: number
}) {
  const [copied, setCopied] = useState(false)
  const reviewHref = childIdFilter != null ? `/record/reviews?child_id=${childIdFilter}` : '/record/reviews'
  const recordHref = childIdFilter != null ? `/record?child_id=${childIdFilter}&about=child` : '/record'
  const careHubHref = '/command-centre'

  const copySummary = useCallback(async () => {
    if (!dashboard) return
    const text = buildGovernanceSummaryText(dashboard)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [dashboard])

  return (
    <section data-testid="recording-governance-actions" className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-950">ORB governance support</h2>
        <p className="text-sm font-semibold text-slate-600">
          ORB supports oversight, but manager judgement remains required. Links use operational ORB only.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={reviewHref}
          data-testid="recording-governance-open-review-queue"
          className="inline-flex min-h-10 items-center rounded-2xl bg-purple-600 px-4 py-2 text-xs font-black text-white"
        >
          Open review queue
        </Link>
        <Link
          href={recordHref}
          className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
        >
          Open all recording forms
        </Link>
        <Link
          href={careHubHref}
          className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
        >
          Open Care Hub
        </Link>
        <button
          type="button"
          onClick={() => void copySummary()}
          disabled={!dashboard}
          data-testid="recording-governance-copy-summary"
          className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
        >
          {copied ? 'Copied' : 'Copy governance summary'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <OrbInlineHint
          label="Ask ORB for recording governance summary"
          href={operationalOrbGovernanceHref('manager_daily_brief', 'Summarise recording governance themes for my home today.')}
          tone="cyan"
        />
        <OrbInlineHint
          label="Ask ORB what needs manager review"
          href={operationalOrbGovernanceHref('record_quality_review', 'What recording drafts may need manager review?')}
        />
        <OrbInlineHint
          label="Ask ORB about recording quality themes"
          href={operationalOrbGovernanceHref('record_quality_review')}
        />
        <OrbInlineHint
          label="Ask ORB about safeguarding-sensitive records"
          href={operationalOrbGovernanceHref('safeguarding_themes')}
        />
      </div>
      <p className="text-xs font-semibold text-slate-500" data-testid="recording-governance-orb-notice">
        Ask OS ORB via /assistant/orb — no draft IDs or record bodies are passed in URLs.
      </p>
    </section>
  )
}
