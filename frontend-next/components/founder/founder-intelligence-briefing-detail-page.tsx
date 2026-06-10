'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import { founderGet, founderPatch } from '@/lib/founder/api/founder-api-client'
import { getApprovalItem } from '@/lib/founder/approvals/approval-store'
import type { FounderBriefing } from '@/lib/founder/intelligence-centre/intelligence-centre-types'
import { isExternalBriefingType } from '@/lib/founder/intelligence-centre/intelligence-centre-types'
import { briefingToPlainText } from '@/lib/founder/intelligence-centre/intelligence-store'

export function FounderIntelligenceBriefingDetailPage({ briefingId }: { briefingId: string }) {
  const [briefing, setBriefing] = useState<FounderBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const result = await founderGet<{ briefing: FounderBriefing }>(`/intelligence/briefings/${briefingId}`)
    if (result.ok) setBriefing(result.data.briefing)
    else setError(result.error)
  }, [briefingId])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  async function handleCopy() {
    if (!briefing) return
    const external = isExternalBriefingType(briefing.type)
    const approval = briefing.approvalId ? getApprovalItem(briefing.approvalId) : undefined
    if (external && briefing.status !== 'approved' && approval?.status !== 'approved') {
      setError('External briefing copy requires approval. Review at /founder/approvals.')
      return
    }
    await navigator.clipboard.writeText(briefingToPlainText(briefing))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleArchive() {
    const result = await founderPatch<{ briefing: FounderBriefing }>(`/intelligence/briefings/${briefingId}`, {
      status: 'archived'
    })
    if (result.ok) setBriefing(result.data.briefing)
  }

  async function handleSendToApprovals() {
    if (!briefing?.approvalId) {
      setError('No approval linked — regenerate an external briefing type.')
      return
    }
    window.location.href = '/founder/approvals'
  }

  if (loading) {
    return <p className="p-8 text-slate-400">Loading briefing…</p>
  }

  if (!briefing) {
    return <p className="p-8 text-rose-300">{error ?? 'Briefing not found'}</p>
  }

  const approval = briefing.approvalId ? getApprovalItem(briefing.approvalId) : undefined

  return (
    <div className="founder-dashboard min-h-screen" data-testid="founder-intelligence-briefing-detail">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1000px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title={briefing.title}
          subtitle={briefing.summary}
          showBack
          backHref="/founder/intelligence/briefings"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"
            data-testid="copy-briefing-text"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy Briefing Text
          </button>
          <SaveToFounderMemoryButton
            type="milestone"
            title={briefing.title}
            content={briefingToPlainText(briefing)}
            tags={['intelligence', 'briefing', briefing.type]}
            linkedEntityId={briefing.id}
            linkedEntityType="founder_briefing"
            source="Founder Intelligence Centre"
          />
          {briefing.approvalId ? (
            <button
              type="button"
              onClick={() => void handleSendToApprovals()}
              className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200"
            >
              Send to Approvals
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleArchive()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400"
          >
            Archive
          </button>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {approval ? (
          <p className="text-sm text-amber-200/90">
            Approval status: <strong>{approval.status}</strong>
            {isExternalBriefingType(briefing.type) && approval.status !== 'approved'
              ? ' — external copy blocked until approved'
              : ''}
          </p>
        ) : null}

        {briefing.sections.map((section) => (
          <FounderSectionCard key={section.id} title={section.title}>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{section.body}</p>
            {section.evidencePoints.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase text-slate-500">Evidence points</p>
                <ul className="mt-2 list-inside list-disc text-sm text-slate-400">
                  {section.evidencePoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {section.risks.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase text-slate-500">Risks</p>
                <ul className="mt-2 list-inside list-disc text-sm text-rose-200/80">
                  {section.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {section.recommendedActions.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase text-slate-500">Recommended actions</p>
                <ul className="mt-2 list-inside list-disc text-sm text-cyan-200/90">
                  {section.recommendedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </FounderSectionCard>
        ))}

        <FounderSectionCard eyebrow="Limitations" title="Data limitations">
          <ul className="list-inside list-disc text-sm text-amber-200/90">
            {briefing.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </FounderSectionCard>
      </div>
    </div>
  )
}
