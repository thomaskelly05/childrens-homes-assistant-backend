'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, Loader2 } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import { founderGet, founderPost } from '@/lib/founder/api/founder-api-client'
import { getEvidencePack } from '@/lib/founder/evidence/evidence-store'
import { evidenceAudienceLabel } from '@/lib/founder/relationships/relationship-evidence'
import type { RelationshipIntelligence } from '@/lib/founder/relationships/relationship-intelligence-engine'
import { hydrateRelationshipsFromPersistence } from '@/lib/founder/relationships/relationship-store'
import {
  RELATIONSHIP_STATUS_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  type RelationshipBundle
} from '@/lib/founder/relationships/relationship-types'

type DetailPayload = {
  bundle: RelationshipBundle
  intelligence: RelationshipIntelligence
}

type FounderRelationshipDetailPageProps = {
  relationshipId: string
}

export function FounderRelationshipDetailPage({ relationshipId }: FounderRelationshipDetailPageProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DetailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [noteSummary, setNoteSummary] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [opportunityTitle, setOpportunityTitle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    await hydrateRelationshipsFromPersistence()
    const result = await founderGet<DetailPayload>(`/relationships/${relationshipId}`)
    if (!result.ok) {
      setError(result.error)
      setData(null)
    } else {
      setData(result.data)
    }
    setLoading(false)
  }, [relationshipId])

  useEffect(() => {
    void load()
  }, [load])

  async function runAction(path: string, success: string) {
    setActionMessage(null)
    const result = await founderPost(path, {})
    if (!result.ok) {
      setActionMessage(result.error)
      return
    }
    setActionMessage(success)
    await load()
  }

  async function addNote() {
    if (!noteSummary.trim()) return
    const result = await founderPost(`/relationships/${relationshipId}/interactions`, {
      type: 'note',
      summary: noteSummary,
      outcome: 'Note recorded in founder relationship intelligence'
    })
    if (!result.ok) {
      setActionMessage(result.error)
      return
    }
    setNoteSummary('')
    setActionMessage('Note added.')
    await load()
  }

  async function logMeeting() {
    const result = await founderPost(`/relationships/${relationshipId}/interactions`, {
      type: 'meeting',
      summary: noteSummary || 'Meeting logged',
      outcome: 'Meeting recorded — update next action as needed'
    })
    if (!result.ok) {
      setActionMessage(result.error)
      return
    }
    setNoteSummary('')
    setActionMessage('Meeting logged.')
    await load()
  }

  async function addOpportunity() {
    if (!opportunityTitle.trim()) return
    const result = await founderPost(`/relationships/${relationshipId}/opportunities`, {
      title: opportunityTitle,
      opportunityType: 'pilot',
      status: 'open',
      confidence: 'medium',
      evidenceNeeded: ['Pilot proposal', 'Ofsted readiness summary'],
      nextStep: 'Prepare evidence pack and follow-up draft'
    })
    if (!result.ok) {
      setActionMessage(result.error)
      return
    }
    setOpportunityTitle('')
    setActionMessage('Opportunity added.')
    await load()
  }

  if (loading) {
    return (
      <div className="founder-page mx-auto max-w-5xl px-4 py-10">
        <p className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading relationship…
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="founder-page mx-auto max-w-5xl px-4 py-10">
        <FounderNavHeader title="Relationship not found" showBack backHref="/founder/relationships" />
        {error ? <p className="mt-4 text-rose-300">{error}</p> : null}
      </div>
    )
  }

  const { bundle, intelligence } = data
  const { relationship, interactions, opportunities } = bundle
  const evidenceNeeded = opportunities.flatMap((o) => o.evidenceNeeded)
  const linkedPacks = (relationship.linkedEvidencePackIds ?? [])
    .map((id) => getEvidencePack(id))
    .filter(Boolean)

  const memoryContent = [
    `Organisation: ${relationship.organisation}`,
    `Type: ${RELATIONSHIP_TYPE_LABELS[relationship.relationshipType]}`,
    `Status: ${RELATIONSHIP_STATUS_LABELS[relationship.status]}`,
    `Priority: ${relationship.priority}`,
    `Next action: ${relationship.nextAction}`,
    intelligence.followUpReason ? `Follow-up: ${intelligence.followUpReason}` : ''
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="founder-page mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-8">
      <FounderNavHeader
        title={relationship.name}
        subtitle={`${relationship.organisation} — ${RELATIONSHIP_TYPE_LABELS[relationship.relationshipType]}`}
        showBack
        backHref="/founder/relationships"
      />

      {actionMessage ? <p className="text-sm text-cyan-200">{actionMessage}</p> : null}

      <section className="grid gap-4 md:grid-cols-2">
        <FounderSectionCard title="Contact details">
          <dl className="space-y-2 text-sm text-slate-300">
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Status</dt>
              <dd>{RELATIONSHIP_STATUS_LABELS[relationship.status]}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Priority</dt>
              <dd>{relationship.priority} (score {intelligence.priorityScore})</dd>
            </div>
            {relationship.email ? (
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Email</dt>
                <dd>{relationship.email}</dd>
              </div>
            ) : null}
            {relationship.linkedin ? (
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">LinkedIn</dt>
                <dd className="break-all">{relationship.linkedin}</dd>
              </div>
            ) : null}
            {relationship.website ? (
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Website</dt>
                <dd className="break-all">{relationship.website}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Notes</dt>
              <dd>{relationship.notes || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Interests</dt>
              <dd>{relationship.interests.length > 0 ? relationship.interests.join(', ') : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Next action</dt>
              <dd>{relationship.nextAction}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Next action due</dt>
              <dd>{relationship.nextActionDue ? new Date(relationship.nextActionDue).toLocaleDateString('en-GB') : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">Tags</dt>
              <dd>{relationship.tags.length > 0 ? relationship.tags.join(', ') : '—'}</dd>
            </div>
          </dl>
        </FounderSectionCard>

        <FounderSectionCard title="Intelligence">
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <strong className="text-white">Suggested next action:</strong> {intelligence.suggestedNextAction}
            </li>
            <li>
              <strong className="text-white">Risk of going cold:</strong> {intelligence.riskOfGoingCold}
            </li>
            <li>
              <strong className="text-white">Opportunity score:</strong> {intelligence.opportunityScore}
            </li>
            {intelligence.evidencePackRecommended ? (
              <li>
                <strong className="text-white">Evidence recommended:</strong>{' '}
                {intelligence.recommendedEvidenceAudience
                  ? evidenceAudienceLabel(intelligence.recommendedEvidenceAudience as Parameters<typeof evidenceAudienceLabel>[0])
                  : 'Yes'}
              </li>
            ) : null}
          </ul>
        </FounderSectionCard>
      </section>

      <FounderSectionCard title="Timeline / interactions">
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={noteSummary}
            onChange={(e) => setNoteSummary(e.target.value)}
            placeholder="Interaction summary"
            className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => void addNote()}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200"
          >
            Add Note
          </button>
          <button
            type="button"
            onClick={() => void logMeeting()}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200"
          >
            Log Meeting
          </button>
        </div>
        <div className="space-y-3">
          {interactions.length === 0 ? (
            <p className="text-sm text-slate-500">No interactions recorded yet.</p>
          ) : (
            interactions.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <p className="font-bold text-white">
                  {item.type} — {new Date(item.createdAt).toLocaleString('en-GB')}
                </p>
                <p className="mt-1 text-slate-300">{item.summary}</p>
                <p className="mt-1 text-slate-400">Outcome: {item.outcome}</p>
              </article>
            ))
          )}
        </div>
      </FounderSectionCard>

      <FounderSectionCard title="Opportunities">
        <div className="mb-4 flex gap-2">
          <input
            value={opportunityTitle}
            onChange={(e) => setOpportunityTitle(e.target.value)}
            placeholder="Opportunity title"
            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => void addOpportunity()}
            className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200"
          >
            Add Opportunity
          </button>
        </div>
        <div className="space-y-3">
          {opportunities.length === 0 ? (
            <p className="text-sm text-slate-500">No opportunities recorded.</p>
          ) : (
            opportunities.map((opp) => (
              <article key={opp.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <p className="font-bold text-white">{opp.title}</p>
                <p className="text-slate-400">
                  {opp.opportunityType} — {opp.status} ({opp.confidence} confidence)
                </p>
                {opp.valueEstimate ? (
                  <p className="mt-1 text-cyan-200">Commercial value estimate: {opp.valueEstimate}</p>
                ) : null}
                <p className="mt-1 text-slate-300">Next: {opp.nextStep}</p>
              </article>
            ))
          )}
        </div>
      </FounderSectionCard>

      {opportunities.some((o) => o.valueEstimate || o.opportunityType === 'investment' || o.opportunityType === 'provider-sale') ? (
        <FounderSectionCard
          title="Commercial intelligence"
          description="Revenue forecasts are modelled assumptions — approve before external commercial claims."
        >
          <ul className="space-y-2 text-sm text-slate-300">
            {opportunities
              .filter((o) => o.valueEstimate)
              .map((o) => (
                <li key={o.id}>
                  <strong className="text-white">{o.title}:</strong> {o.valueEstimate}
                </li>
              ))}
            {(relationship.relationshipType === 'investor' || relationship.relationshipType === 'provider') && (
              <li>Consider a conservative revenue forecast for this relationship before investor or provider conversations.</li>
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/founder/revenue/forecast"
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
            >
              Build revenue forecast
            </Link>
            {intelligence.evidencePackRecommended ? (
              <button
                type="button"
                onClick={() => void runAction(`/relationships/${relationshipId}/evidence-pack`, 'Evidence pack queued.')}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200"
              >
                Generate evidence pack
              </button>
            ) : null}
          </div>
        </FounderSectionCard>
      ) : null}

      {evidenceNeeded.length > 0 ? (
        <FounderSectionCard title="Evidence needed">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {evidenceNeeded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </FounderSectionCard>
      ) : null}

      {linkedPacks.length > 0 ? (
        <FounderSectionCard title="Related evidence packs">
          <ul className="space-y-2 text-sm">
            {linkedPacks.map((pack) =>
              pack ? (
                <li key={pack.id}>
                  <Link href={`/founder/evidence/${pack.id}`} className="text-cyan-300 hover:text-cyan-200">
                    {pack.title} ({pack.status})
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        </FounderSectionCard>
      ) : null}

      <FounderSectionCard title="Draft message area">
        <textarea
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          rows={6}
          placeholder="Draft outreach text for review — not sent automatically"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        />
        <p className="mt-2 text-xs text-slate-500">
          Use Generate Follow-up Draft to queue a relationship-message approval. No emails or LinkedIn posts are sent
          automatically.
        </p>
      </FounderSectionCard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void runAction(
              `/relationships/${relationshipId}/follow-up-draft`,
              'Follow-up draft queued for approval (relationship-message).'
            )
          }
          className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
        >
          Generate Follow-up Draft
        </button>
        <button
          type="button"
          onClick={() =>
            void runAction(
              `/relationships/${relationshipId}/evidence-pack`,
              'Evidence pack generated and linked. Approval required before external use.'
            )
          }
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200"
        >
          Generate Evidence Pack
        </button>
        <SaveToFounderMemoryButton
          type="relationship-note"
          title={`Relationship: ${relationship.organisation}`}
          content={memoryContent}
          linkedEntityId={relationship.id}
          linkedEntityType="relationship"
          source="founder-relationships"
        />
        <Link
          href={`/founder/orb?q=${encodeURIComponent(`Ask about relationship ${relationship.organisation}`)}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200"
        >
          <Bot className="h-3.5 w-3.5" aria-hidden />
          Ask ORB Founder
        </Link>
        <button
          type="button"
          onClick={() =>
            void runAction(`/relationships/${relationshipId}/archive`, 'Relationship archived.')
          }
          className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-200"
        >
          Archive
        </button>
      </div>
    </div>
  )
}
