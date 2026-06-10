'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileCheck, Loader2 } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderGet, founderPost } from '@/lib/founder/api/founder-api-client'
import { buildEvidenceSources } from '@/lib/founder/evidence/evidence-source-builder'
import { EVIDENCE_AUDIENCE_LABELS, type EvidenceAudience, type EvidencePack } from '@/lib/founder/evidence/evidence-types'
import { getPackConfidence } from '@/lib/founder/evidence/evidence-store'

const GENERATE_BUTTONS: Array<{ audience: EvidenceAudience; label: string }> = [
  { audience: 'investor', label: 'Investor Pack' },
  { audience: 'provider', label: 'Provider Pack' },
  { audience: 'openai', label: 'OpenAI Pack' },
  { audience: 'microsoft', label: 'Microsoft Pack' },
  { audience: 'innovate-uk', label: 'Innovate UK Pack' },
  { audience: 'dfe', label: 'DfE / Local Authority Pack' },
  { audience: 'pilot-partner', label: 'Pilot Partner Pack' }
]

function PackCard({ pack }: { pack: EvidencePack }) {
  const confidence = getPackConfidence(pack)
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold text-white">{pack.title}</h3>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
          {pack.status}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-300/80">
        {EVIDENCE_AUDIENCE_LABELS[pack.audience]}
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Created {new Date(pack.createdAt).toLocaleString('en-GB')}
      </p>
      <p className="mt-2 text-sm text-slate-300">
        <strong className="text-white">Confidence:</strong> {confidence}
      </p>
      <p className="mt-1 text-sm text-slate-300">
        <strong className="text-white">Data basis:</strong> {pack.dataBasis}
      </p>
      {pack.limitations.length > 0 ? (
        <p className="mt-2 text-xs text-amber-200/90">
          {pack.limitations.slice(0, 2).join(' ')}
        </p>
      ) : null}
      <Link
        href={`/founder/evidence/${pack.id}`}
        className="mt-4 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
      >
        Open Pack
      </Link>
    </article>
  )
}

export function FounderEvidencePage() {
  const [packs, setPacks] = useState<EvidencePack[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<EvidenceAudience | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPacks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await founderGet<{ packs: EvidencePack[] }>('/evidence')
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPacks(result.data.packs ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPacks()
  }, [loadPacks])

  async function handleGenerate(audience: EvidenceAudience) {
    setGenerating(audience)
    setError(null)
    try {
      const result = await founderPost('/evidence/generate', { audience })
      if (!result.ok) {
        setError(result.error)
        return
      }
      await loadPacks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(null)
    }
  }

  const sources = buildEvidenceSources()
  const needingApproval = packs.filter((p) => p.status === 'needs-review' || p.status === 'draft')

  return (
    <div className="founder-dashboard mx-auto max-w-6xl space-y-8 px-4 py-10">
      <FounderNavHeader
        title="Founder Evidence Engine"
        subtitle="Generate honest evidence packs from live IndiCare Intelligence data."
      />

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      <FounderSectionCard
        eyebrow="Generate"
        title="Generate New Evidence Pack"
        description="Each pack is built from live telemetry, Quality Lab, founder memory and governance data. Approval is required before external use."
      >
        <div className="flex flex-wrap gap-2">
          {GENERATE_BUTTONS.map(({ audience, label }) => (
            <button
              key={audience}
              type="button"
              disabled={generating !== null}
              onClick={() => void handleGenerate(audience)}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
            >
              {generating === audience ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </FounderSectionCard>

      <FounderSectionCard eyebrow="Packs" title="Existing Packs">
        {loading ? (
          <p className="text-sm text-slate-400">Loading evidence packs…</p>
        ) : packs.length === 0 ? (
          <p className="text-sm text-slate-400">No evidence packs yet. Generate one above.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}
      </FounderSectionCard>

      <FounderSectionCard eyebrow="Sources" title="Evidence Sources">
        <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
          <li>Strategic context: {sources.strategicContext.length} items</li>
          <li>Telemetry evidence: {sources.telemetryEvidence.length} points</li>
          <li>Quality evidence: {sources.qualityEvidence.length} points</li>
          <li>Product evidence: {sources.productEvidence.length} points</li>
          <li>Governance evidence: {sources.governanceEvidence.length} points</li>
          <li>Safety evidence: {sources.safetyEvidence.length} points</li>
        </ul>
      </FounderSectionCard>

      <FounderSectionCard eyebrow="Limits" title="Data Limitations">
        <ul className="list-inside list-disc space-y-1 text-sm text-amber-200/90">
          {sources.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </FounderSectionCard>

      <FounderSectionCard eyebrow="Approval" title="Packs Needing Approval">
        {needingApproval.length === 0 ? (
          <p className="text-sm text-slate-400">No packs awaiting approval.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {needingApproval.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}
      </FounderSectionCard>
    </div>
  )
}
