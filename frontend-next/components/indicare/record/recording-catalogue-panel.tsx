'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import {
  RECORDING_FORM_CATEGORIES,
  RECORDING_STATUS_FILTERS,
  catalogueRecordingForms,
  resolveFormRoute,
  routeStatusLabel,
  workflowStatusBadgeClass,
  workflowStatusLabel,
  workflowStatusMicrocopy,
  type RecordingFormCategory,
  type RecordingFormDefinition
} from '@/lib/record/recording-form-registry'
import type { RecordAboutContext } from '@/lib/record/recording-hub'

type CategoryFilter = RecordingFormCategory | 'all'

export function RecordingCataloguePanel({
  about,
  childId,
  onSelectForm
}: {
  about: RecordAboutContext
  childId?: string
  onSelectForm?: (form: RecordingFormDefinition) => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<string | 'all'>('all')
  const [showAll, setShowAll] = useState(true)

  const allForms = useMemo(() => catalogueRecordingForms(), [])

  const visibleForms = useMemo(() => {
    const query = search.trim().toLowerCase()
    let list = allForms

    if (category !== 'all') {
      list = list.filter((form) => form.category === category)
    }

    if (statusFilter !== 'all') {
      const filterDef = RECORDING_STATUS_FILTERS.find((f) => f.id === statusFilter)
      if (filterDef) list = list.filter(filterDef.match)
    }

    if (about === 'staff') {
      list = list.filter((form) => !form.requiresChild || form.category === 'workforce' || form.category === 'manager_governance')
    }

    if (query) {
      list = list.filter((form) => {
        const haystack = [
          form.title,
          form.description,
          form.id,
          ...form.tags,
          ...form.relatedEvidenceAreas
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
    }

    if (!showAll) {
      list = list.filter((form) => form.priority === 'P0' || form.priority === 'P1')
    }

    return list
  }, [allForms, about, category, search, showAll, statusFilter])

  const p0Forms = useMemo(() => visibleForms.filter((f) => f.priority === 'P0'), [visibleForms])
  const restForms = useMemo(() => visibleForms.filter((f) => f.priority !== 'P0'), [visibleForms])

  return (
    <section
      data-testid="recording-catalogue-panel"
      className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Recording catalogue</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">All children&apos;s homes recording forms</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Aligned to children&apos;s homes practice and inspection evidence. Supports SCCIF / Quality Standards evidence — not a
            legal completeness guarantee. Every form can be opened and drafted; formal submit only where wired and safe.
          </p>
        </div>
        <label className="relative w-full max-w-md">
          <span className="sr-only">Search forms</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            data-testid="recording-catalogue-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search forms (e.g. safeguarding, Reg 44, fire drill)"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" data-testid="recording-catalogue-category-filters">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-black ${category === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          All
        </button>
        {RECORDING_FORM_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${category === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2" data-testid="recording-catalogue-status-filters">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          All statuses
        </button>
        {RECORDING_STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setStatusFilter(filter.id)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${statusFilter === filter.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          Show all recording forms ({allForms.length})
        </label>
        <span className="text-xs font-semibold text-slate-500">{visibleForms.length} matching</span>
      </div>

      {p0Forms.length > 0 && !search ? (
        <div className="mt-6">
          <h3 className="text-sm font-black text-slate-950">Most used (P0)</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p0Forms.map((form) => (
              <CatalogueFormCard key={form.id} form={form} childId={childId} onSelectForm={onSelectForm} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        {!search && p0Forms.length > 0 ? (
          <h3 className="text-sm font-black text-slate-950">All matching forms</h3>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="recording-catalogue-grid">
          {(search || p0Forms.length === 0 ? visibleForms : restForms).map((form) => (
            <CatalogueFormCard key={form.id} form={form} childId={childId} onSelectForm={onSelectForm} />
          ))}
        </div>
        {visibleForms.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-slate-500">No forms match your search. Try safeguarding, medication, restraint, or Reg 44.</p>
        ) : null}
      </div>
    </section>
  )
}

function CatalogueFormCard({
  form,
  childId,
  onSelectForm
}: {
  form: RecordingFormDefinition
  childId?: string
  onSelectForm?: (form: RecordingFormDefinition) => void
}) {
  const href = resolveFormRoute(form, childId)
  const needsChild = form.requiresChild && !childId

  return (
    <article
      data-testid={`recording-catalogue-card-${form.id}`}
      className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-black text-slate-950">{form.title}</h4>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-blue-900">
          {form.priority}
        </span>
      </div>
      <p className="mt-2 flex-1 text-xs font-semibold leading-5 text-slate-600">{form.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${workflowStatusBadgeClass(form.workflowStatus)}`}
        >
          {workflowStatusLabel(form.workflowStatus)}
        </span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-700">
          {routeStatusLabel(form.routeKind)}
        </span>
        {form.requiresManagerReview ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-amber-900">
            Review
          </span>
        ) : null}
        {form.safeguardingSensitive ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-rose-900">
            Safeguarding
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">
        ORB: {form.orbSuggestedPrompts[0] || 'Recording quality support via operational ORB'}
      </p>
      <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
        {workflowStatusMicrocopy(form.workflowStatus, form.routeKind)}
      </p>
      {needsChild ? (
        <p className="mt-2 text-[10px] font-black text-amber-900">Choose a child to open child-specific workflow.</p>
      ) : null}
      <div className="mt-3">
        {onSelectForm ? (
          <button
            type="button"
            onClick={() => onSelectForm(form)}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
          >
            Open
          </button>
        ) : (
          <Link
            href={href}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white"
          >
            Open
          </Link>
        )}
      </div>
    </article>
  )
}
