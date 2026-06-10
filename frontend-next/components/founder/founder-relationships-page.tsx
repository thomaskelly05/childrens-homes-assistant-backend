'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderPost } from '@/lib/founder/api/founder-api-client'
import { summariseRelationshipIntelligence } from '@/lib/founder/relationships/relationship-intelligence-engine'
import {
  getActiveRelationships,
  getRelationshipBundles,
  hydrateRelationshipsFromPersistence
} from '@/lib/founder/relationships/relationship-store'
import {
  PIPELINE_STATUSES,
  RELATIONSHIP_STATUS_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  TYPE_COUNT_GROUPS,
  type FounderRelationship,
  type RelationshipPriority,
  type RelationshipStatus,
  type RelationshipType
} from '@/lib/founder/relationships/relationship-types'

const RELATIONSHIP_TYPES = Object.keys(RELATIONSHIP_TYPE_LABELS) as RelationshipType[]
const PRIORITIES: RelationshipPriority[] = ['critical', 'high', 'medium', 'low']

type FormState = {
  name: string
  organisation: string
  relationshipType: RelationshipType
  status: RelationshipStatus
  priority: RelationshipPriority
  email: string
  linkedin: string
  website: string
  notes: string
  nextAction: string
  nextActionDue: string
  tags: string
}

const EMPTY_FORM: FormState = {
  name: '',
  organisation: '',
  relationshipType: 'provider',
  status: 'new',
  priority: 'medium',
  email: '',
  linkedin: '',
  website: '',
  notes: '',
  nextAction: '',
  nextActionDue: '',
  tags: ''
}

function RelationshipCard({ relationship }: { relationship: FounderRelationship }) {
  return (
    <Link
      href={`/founder/relationships/${relationship.id}`}
      className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white">{relationship.name}</p>
          <p className="text-sm text-slate-400">{relationship.organisation}</p>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
          {relationship.priority}
        </span>
      </div>
      <p className="mt-2 text-xs text-cyan-300/80">{RELATIONSHIP_TYPE_LABELS[relationship.relationshipType]}</p>
      {relationship.nextAction ? (
        <p className="mt-2 text-xs text-slate-400">Next: {relationship.nextAction}</p>
      ) : null}
    </Link>
  )
}

export function FounderRelationshipsPage() {
  const [, setTick] = useState(0)
  const [hydrating, setHydrating] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterDue, setFilterDue] = useState(false)
  const [filterTag, setFilterTag] = useState('')

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let active = true
    void hydrateRelationshipsFromPersistence()
      .then(() => {
        if (active) refresh()
      })
      .finally(() => {
        if (active) setHydrating(false)
      })
    return () => {
      active = false
    }
  }, [refresh])

  const summary = useMemo(() => summariseRelationshipIntelligence(), [hydrating])

  const filteredRelationships = useMemo(() => {
    let list = getActiveRelationships()
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        [r.name, r.organisation, r.notes, r.nextAction, ...r.tags].join(' ').toLowerCase().includes(q)
      )
    }
    if (filterType) list = list.filter((r) => r.relationshipType === filterType)
    if (filterStatus) list = list.filter((r) => r.status === filterStatus)
    if (filterPriority) list = list.filter((r) => r.priority === filterPriority)
    if (filterTag) list = list.filter((r) => r.tags.includes(filterTag))
    if (filterDue) {
      const dueIds = new Set(
        getRelationshipBundles()
          .filter((b) => {
            const due = b.relationship.nextActionDue
            return due && Date.parse(due) <= Date.now()
          })
          .map((b) => b.relationship.id)
      )
      list = list.filter((r) => dueIds.has(r.id) || r.status === 'follow-up-needed')
    }
    return list
  }, [search, filterType, filterStatus, filterPriority, filterTag, filterDue, hydrating])

  const pipeline = useMemo(() => {
    const map = new Map<RelationshipStatus, FounderRelationship[]>()
    for (const status of PIPELINE_STATUSES) map.set(status, [])
    for (const rel of filteredRelationships) {
      if (map.has(rel.status)) map.get(rel.status)!.push(rel)
    }
    return map
  }, [filteredRelationships])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const result = await founderPost('/relationships', {
        ...form,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      await hydrateRelationshipsFromPersistence()
      setForm(EMPTY_FORM)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="founder-page mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8">
      <FounderNavHeader
        title="Founder Relationships"
        subtitle="Private relationship intelligence for IndiCare Intelligence."
      />

      {hydrating ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading relationships…
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total relationships', value: summary.totalActive },
          { label: 'High priority', value: summary.highPriority },
          { label: 'Follow-ups due', value: summary.followUpsDue },
          { label: 'Active opportunities', value: summary.activeOpportunities },
          { label: 'Pilot opportunities', value: summary.pilotOpportunities },
          { label: 'Investor conversations', value: summary.investorConversations }
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
          </article>
        ))}
      </section>

      <FounderSectionCard title="Search and filters" eyebrow="Filters">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input
            type="search"
            placeholder="Search relationships…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value="">All types</option>
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {RELATIONSHIP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RELATIONSHIP_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by tag"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={filterDue} onChange={(e) => setFilterDue(e.target.checked)} />
            Due follow-up only
          </label>
        </div>
      </FounderSectionCard>

      <FounderSectionCard title="Relationship types">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TYPE_COUNT_GROUPS.map((group) => {
            const count = getActiveRelationships().filter((r) => group.types.includes(r.relationshipType)).length
            return (
              <div key={group.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{group.label}</p>
                <p className="mt-1 text-2xl font-black text-white">{count}</p>
              </div>
            )
          })}
        </div>
      </FounderSectionCard>

      <FounderSectionCard title="Relationship pipeline">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="text-sm font-bold text-cyan-200">
                {RELATIONSHIP_STATUS_LABELS[status]} ({pipeline.get(status)?.length ?? 0})
              </h3>
              <div className="mt-3 space-y-2">
                {(pipeline.get(status) ?? []).slice(0, 6).map((rel) => (
                  <RelationshipCard key={rel.id} relationship={rel} />
                ))}
                {(pipeline.get(status)?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-500">No relationships in this stage.</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </FounderSectionCard>

      <FounderSectionCard title="Add relationship">
        <form onSubmit={(e) => void handleCreate(e)} className="grid gap-3 md:grid-cols-2">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <input
            required
            placeholder="Organisation"
            value={form.organisation}
            onChange={(e) => setForm({ ...form, organisation: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <select
            value={form.relationshipType}
            onChange={(e) => setForm({ ...form, relationshipType: e.target.value as RelationshipType })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {RELATIONSHIP_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as RelationshipStatus })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RELATIONSHIP_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as RelationshipPriority })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="LinkedIn URL"
            value={form.linkedin}
            onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <input
            required
            placeholder="Next action"
            value={form.nextAction}
            onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white md:col-span-2"
          />
          <input
            type="date"
            value={form.nextActionDue}
            onChange={(e) => setForm({ ...form, nextActionDue: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Tags (comma-separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white md:col-span-2"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add relationship'}
            </button>
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
          </div>
        </form>
      </FounderSectionCard>
    </div>
  )
}
