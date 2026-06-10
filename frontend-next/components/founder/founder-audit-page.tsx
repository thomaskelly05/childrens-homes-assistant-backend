'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { FounderEvidenceQuickLink } from '@/components/founder/founder-evidence-quick-link'
import { listAuditLog } from '@/lib/founder/persistence'
import type { FounderAuditLogRecord, FounderEntityType } from '@/lib/founder/persistence/founder-persistence-types'

const FILTER_OPTIONS: Array<{ id: string; label: string; entityType?: FounderEntityType }> = [
  { id: 'all', label: 'All events' },
  { id: 'actions', label: 'Actions', entityType: 'action' },
  { id: 'approvals', label: 'Approvals', entityType: 'approval' },
  { id: 'content', label: 'Content', entityType: 'content' },
  { id: 'quality', label: 'Quality Lab', entityType: 'quality_run' },
  { id: 'expert', label: 'Expert reviews', entityType: 'expert_review' },
  { id: 'briefs', label: 'Build briefs', entityType: 'build_brief' },
  { id: 'loop', label: 'Operating loop', entityType: 'operating_loop_run' },
  { id: 'safety', label: 'Safety', entityType: 'safety_review' },
  { id: 'staff', label: 'Staff team', entityType: 'staff_team_run' },
  { id: 'agents', label: 'Agent runs', entityType: 'agent_run' },
  { id: 'memory', label: 'Founder memory', entityType: 'founder_memory' },
  { id: 'evidence', label: 'Evidence packs', entityType: 'evidence_pack' }
]

function AuditRow({ entry }: { entry: FounderAuditLogRecord }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString('en-GB')}</p>
          <p className="mt-1 font-bold text-white">{entry.summary}</p>
          <p className="mt-1 text-xs text-slate-500">
            {entry.actor} · {entry.eventType} · {entry.entityType}
            {entry.linkedEntityId ? ` · linked ${entry.linkedEntityType ?? 'entity'} ${entry.linkedEntityId}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {entry.status ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
              {entry.status}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
            aria-expanded={open}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && entry.metadata && Object.keys(entry.metadata).length > 0 ? (
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-slate-400">
          {JSON.stringify(entry.metadata, null, 2)}
        </pre>
      ) : null}
    </article>
  )
}

export function FounderAuditPage() {
  const [entries, setEntries] = useState<FounderAuditLogRecord[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const selected = FILTER_OPTIONS.find((f) => f.id === filter)
    const items = await listAuditLog({
      entityType: selected?.entityType,
      limit: 200
    })
    setEntries(items)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Audit Trail"
          subtitle="Private record of agent outputs, approvals, quality reviews and founder decisions."
        />

        <p className="text-sm text-slate-400">
          Evidence pack create, update and approval events are recorded here. Open the{' '}
          <FounderEvidenceQuickLink className="inline-flex items-center gap-1 font-semibold text-cyan-300 hover:text-cyan-200" label="Evidence Engine" />{' '}
          to review packs.
        </p>

        <FounderSectionCard eyebrow="Filters" title="Audit events">
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  filter === option.id
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading audit trail…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events recorded yet.</p>
          ) : (
            <div className="space-y-3" data-testid="founder-audit-trail">
              {entries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </FounderSectionCard>
      </div>
    </div>
  )
}
