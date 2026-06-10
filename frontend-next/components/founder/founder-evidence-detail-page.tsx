'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Check, Copy, Send } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import { founderPost } from '@/lib/founder/api/founder-api-client'
import { formatEvidencePackText } from '@/lib/founder/evidence/evidence-pack-generator'
import { EVIDENCE_AUDIENCE_LABELS, type EvidencePack } from '@/lib/founder/evidence/evidence-types'
import {
  canCopyEvidencePack,
  getEvidencePack,
  hydrateEvidencePacksFromPersistence
} from '@/lib/founder/evidence/evidence-store'

type Props = {
  packId: string
}

export function FounderEvidenceDetailPage({ packId }: Props) {
  const router = useRouter()
  const [pack, setPack] = useState<EvidencePack | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const loadPack = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cached = getEvidencePack(packId)
      if (cached) {
        setPack(cached)
        return
      }
      await hydrateEvidencePacksFromPersistence()
      const hydrated = getEvidencePack(packId)
      if (!hydrated) {
        setError('Pack not found')
        return
      }
      setPack(hydrated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pack')
    } finally {
      setLoading(false)
    }
  }, [packId])

  useEffect(() => {
    void loadPack()
  }, [loadPack])

  async function handleCopy() {
    if (!pack || !canCopyEvidencePack(pack)) {
      setActionMessage('Copy is available only for approved packs that passed safety review.')
      return
    }
    await navigator.clipboard.writeText(formatEvidencePackText(pack))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSendToApprovals() {
    if (!pack) return
    const result = await founderPost(`/evidence/${encodeURIComponent(pack.id)}/approve`)
    if (result.ok) {
      setActionMessage('Pack queued for approval.')
      await loadPack()
    } else {
      setActionMessage(result.error)
    }
  }

  async function handleArchive() {
    if (!pack) return
    const result = await founderPost(`/evidence/${encodeURIComponent(pack.id)}/archive`)
    if (result.ok) {
      router.push('/founder/evidence')
    } else {
      setActionMessage(result.error)
    }
  }

  if (loading) {
    return (
      <div className="founder-dashboard mx-auto max-w-4xl px-4 py-10">
        <p className="text-slate-400">Loading evidence pack…</p>
      </div>
    )
  }

  if (error || !pack) {
    return (
      <div className="founder-dashboard mx-auto max-w-4xl space-y-4 px-4 py-10">
        <p className="text-rose-200">{error ?? 'Pack not found'}</p>
        <Link href="/founder/evidence" className="text-cyan-300 hover:text-cyan-200">
          Back to Evidence Engine
        </Link>
      </div>
    )
  }

  const packText = formatEvidencePackText(pack)
  const copyAllowed = canCopyEvidencePack(pack)

  return (
    <div className="founder-dashboard mx-auto max-w-4xl space-y-8 px-4 py-10">
      <FounderNavHeader
        title={pack.title}
        subtitle={pack.purpose}
        showBack
        backHref="/founder/evidence"
      />

      {actionMessage ? (
        <p className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{actionMessage}</p>
      ) : null}

      <FounderSectionCard title="Pack Overview">
        <dl className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <div><dt className="text-slate-500">Audience</dt><dd className="font-semibold text-white">{EVIDENCE_AUDIENCE_LABELS[pack.audience]}</dd></div>
          <div><dt className="text-slate-500">Status</dt><dd className="font-semibold text-white">{pack.status}</dd></div>
          <div><dt className="text-slate-500">Data basis</dt><dd>{pack.dataBasis}</dd></div>
          <div><dt className="text-slate-500">Approval</dt><dd>{pack.approvalId ? `Linked (${pack.approvalId})` : 'Not yet queued'}</dd></div>
          <div className="md:col-span-2">
            <dt className="text-slate-500">Safety review</dt>
            <dd>
              {pack.safetyReview.safe ? 'Passed' : 'Flagged'} —{' '}
              {pack.safetyReview.issues.length > 0
                ? pack.safetyReview.issues.map((i) => i.message).join('; ')
                : 'No issues detected'}
            </dd>
          </div>
        </dl>
      </FounderSectionCard>

      <FounderSectionCard title="Limitations">
        <ul className="list-inside list-disc space-y-1 text-sm text-amber-200/90">
          {pack.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </FounderSectionCard>

      {pack.sections.map((section) => (
        <FounderSectionCard
          key={section.id}
          eyebrow={`${section.confidence} confidence`}
          title={section.title}
          description={section.summary}
        >
          <div className="space-y-4">
            {section.evidencePoints.map((point) => (
              <article key={point.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{point.claim}</p>
                <p className="mt-2 text-sm text-slate-300">{point.support}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Source: {point.sourceLabel} · {point.confidence} confidence
                </p>
                {point.limitation ? (
                  <p className="mt-1 text-xs text-amber-200/90">Limitation: {point.limitation}</p>
                ) : null}
              </article>
            ))}
            {section.limitations.length > 0 ? (
              <ul className="text-xs text-amber-200/90">
                {section.limitations.map((l) => (
                  <li key={l}>— {l}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </FounderSectionCard>
      ))}

      <FounderSectionCard title="Actions">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!copyAllowed}
            title={copyAllowed ? 'Copy pack text' : 'Approval required before copy'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy Pack Text
          </button>
          <SaveToFounderMemoryButton
            type="milestone"
            title={pack.title}
            content={packText.slice(0, 4000)}
            tags={['evidence-pack', pack.audience]}
            linkedEntityId={pack.id}
            linkedEntityType="evidence_pack"
            source="founder-ui"
          />
          <button
            type="button"
            onClick={() => void handleSendToApprovals()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200"
          >
            <Send className="h-3.5 w-3.5" />
            Send to Approvals
          </button>
          <button
            type="button"
            onClick={() => void handleArchive()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-400/30 bg-slate-500/10 px-3 py-2 text-xs font-bold text-slate-300"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive Pack
          </button>
        </div>
        {!copyAllowed ? (
          <p className="mt-3 text-xs text-slate-500">
            External copy requires approved status and a passed safety review.
          </p>
        ) : null}
      </FounderSectionCard>
    </div>
  )
}
