'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Search } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  FOUNDER_MEMORY_TYPE_LABELS,
  archiveFounderMemoryItem,
  createFounderMemoryItem,
  getActiveFounderMemoryItems,
  getFounderMemoryItems,
  getFounderStrategicContext,
  hydrateFounderMemoryFromPersistence,
  searchFounderMemory,
  type FounderMemoryImportance,
  type FounderMemoryItem,
  type FounderMemoryItemType
} from '@/lib/founder/memory'

const ACTIVE_TYPES: FounderMemoryItemType[] = [
  'priority',
  'decision',
  'product-direction',
  'risk',
  'relationship-note',
  'principle',
  'milestone',
  'deferred-item'
]

const IMPORTANCE_TONE: Record<FounderMemoryImportance, string> = {
  critical: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  high: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  medium: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  low: 'border-white/10 bg-white/5 text-slate-400'
}

function MemoryCard({ item, onArchive }: { item: FounderMemoryItem; onArchive?: () => void }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold text-white">{item.title}</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${IMPORTANCE_TONE[item.importance]}`}>
          {item.importance}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.content}</p>
      {item.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-600">
        Updated {new Date(item.updatedAt).toLocaleString('en-GB')} · {item.source}
      </p>
      {onArchive ? (
        <button
          type="button"
          onClick={onArchive}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300"
        >
          <Archive className="h-3.5 w-3.5" aria-hidden />
          Archive
        </button>
      ) : null}
    </article>
  )
}

export function FounderMemoryPage() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const [searchQuery, setSearchQuery] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: 'priority' as FounderMemoryItemType,
    title: '',
    content: '',
    importance: 'medium' as FounderMemoryImportance,
    tags: '',
    status: 'active' as const
  })

  useEffect(() => {
    void hydrateFounderMemoryFromPersistence().then(() => refresh())
  }, [refresh])

  const context = getFounderStrategicContext()
  const allItems = getFounderMemoryItems()
  const activeItems = getActiveFounderMemoryItems()
  const archivedItems = allItems.filter((i) => i.status === 'archived' || i.status === 'superseded')

  const displayedItems = useMemo(() => {
    if (!searchQuery.trim()) return activeItems
    return searchFounderMemory(searchQuery).filter((i) => i.status === 'active')
  }, [searchQuery, activeItems])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const result = await createFounderMemoryItem({
      type: form.type,
      title: form.title,
      content: form.content,
      importance: form.importance,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      status: form.status
    })
    if (result.errors?.length) {
      setFormError(result.errors.join(' '))
      return
    }
    setForm({ type: 'priority', title: '', content: '', importance: 'medium', tags: '', status: 'active' })
    refresh()
  }

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Memory"
          subtitle="Private strategic memory for IndiCare Intelligence."
        />

        <FounderSectionCard eyebrow="Strategic context" title="Strategic Context">
          <div className="grid gap-4 md:grid-cols-2">
            <ContextBlock label="Primary Objective" value={context.primaryObjective || 'Not recorded yet.'} />
            <ContextBlock label="Product Focus" value={context.currentProductFocus || 'Not recorded yet.'} />
            <ContextBlock label="Commercial Focus" value={context.currentCommercialFocus || 'Not recorded yet.'} />
            <ContextBlock
              label="Current Risks"
              value={context.currentRisks.length > 0 ? context.currentRisks.join('\n') : 'None recorded yet.'}
            />
          </div>
          {context.operatingPrinciples.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Operating Principles</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-300">
                {context.operatingPrinciples.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No operating principles recorded yet.</p>
          )}
          <p className="mt-4 text-xs text-slate-600">
            {context.activeMemoryCount} active memory items · Last updated{' '}
            {context.memoryUpdatedAt ? new Date(context.memoryUpdatedAt).toLocaleString('en-GB') : '—'}
          </p>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Search" title="Search Memory">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, content or tags…"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-slate-200"
            />
          </div>
        </FounderSectionCard>

        {searchQuery.trim() ? (
          <FounderSectionCard eyebrow="Results" title={`Search results (${displayedItems.length})`}>
            <div className="space-y-4">
              {displayedItems.length === 0 ? (
                <p className="text-sm text-slate-500">No matching active memory items.</p>
              ) : (
                displayedItems.map((item) => (
                  <MemoryCard
                    key={item.id}
                    item={item}
                    onArchive={() => {
                      void archiveFounderMemoryItem(item.id).then(() => refresh())
                    }}
                  />
                ))
              )}
            </div>
          </FounderSectionCard>
        ) : (
          ACTIVE_TYPES.map((type) => {
            const group = activeItems.filter((i) => i.type === type)
            if (group.length === 0) return null
            return (
              <FounderSectionCard key={type} eyebrow="Active memory" title={FOUNDER_MEMORY_TYPE_LABELS[type]}>
                <div className="space-y-4">
                  {group.map((item) => (
                    <MemoryCard
                      key={item.id}
                      item={item}
                      onArchive={() => {
                        void archiveFounderMemoryItem(item.id).then(() => refresh())
                      }}
                    />
                  ))}
                </div>
              </FounderSectionCard>
            )
          })
        )}

        <FounderSectionCard eyebrow="Add" title="Add Memory Item">
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FounderMemoryItemType }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
                >
                  {ACTIVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FOUNDER_MEMORY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-slate-500">
                Importance
                <select
                  value={form.importance}
                  onChange={(e) => setForm((f) => ({ ...f, importance: e.target.value as FounderMemoryImportance }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-bold uppercase text-slate-500">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
              />
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500">
              Content
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                required
                rows={4}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
              />
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500">
              Tags (comma-separated)
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
              />
            </label>
            {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
            <button
              type="submit"
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200"
            >
              Add Memory Item
            </button>
          </form>
        </FounderSectionCard>

        {archivedItems.length > 0 ? (
          <FounderSectionCard eyebrow="Archive" title="Archived / Superseded Items">
            <div className="space-y-4">
              {archivedItems.map((item) => (
                <MemoryCard key={item.id} item={item} />
              ))}
            </div>
          </FounderSectionCard>
        ) : null}
      </div>
    </div>
  )
}

function ContextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{value}</p>
    </div>
  )
}
