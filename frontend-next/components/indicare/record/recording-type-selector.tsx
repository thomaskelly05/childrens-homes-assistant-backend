'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  defaultSelectorCategoryId,
  RECORDING_SELECTOR_CATEGORIES,
  selectorCategoryById,
  workspaceFormsForSelectorCategory,
  type RecordingSelectorCategoryId
} from '@/lib/record/recording-category-groups'
import { routeStatusLabel, routeStatusMicrocopy } from '@/lib/record/recording-form-registry'
import { guidanceForForm } from '@/lib/record/recording-form-guidance'
import { childRecordHref } from '@/lib/navigation/scope-routes'
import type { RecordAboutContext } from '@/lib/record/recording-hub'
import type { RecordingWorkspaceType } from '@/lib/record/recording-form-registry'
import { recordingTypeVisibleForAbout } from '@/lib/record/recording-types'

function recordStartHref(childId: string | undefined, workspaceType: string, formId?: string) {
  if (childId) {
    const base = childRecordHref(childId, workspaceType)
    if (formId) return `${base}&form=${encodeURIComponent(formId)}`
    return base
  }
  const q = new URLSearchParams({ type: workspaceType })
  if (formId) q.set('form', formId)
  return `/record?${q.toString()}`
}

export function RecordingTypeSelector({
  childId,
  about = 'child',
  value,
  onChange,
  compact = false,
  showBrowseAllLink = true
}: {
  childId?: string
  about?: RecordAboutContext
  value?: RecordingWorkspaceType
  onChange?: (next: RecordingWorkspaceType) => void
  compact?: boolean
  showBrowseAllLink?: boolean
}) {
  const router = useRouter()
  const [categoryId, setCategoryId] = useState<RecordingSelectorCategoryId>(defaultSelectorCategoryId())
  const category = selectorCategoryById(categoryId) || RECORDING_SELECTOR_CATEGORIES[0]

  const typeOptions = useMemo(() => workspaceFormsForSelectorCategory(categoryId, about), [categoryId, about])

  const [selectedType, setSelectedType] = useState<RecordingWorkspaceType | ''>(() => {
    if (value && recordingTypeVisibleForAbout(value, about)) return value
    return typeOptions[0]?.workspaceType || ''
  })

  const effectiveType = value || selectedType
  const selectedForm = typeOptions.find((f) => f.workspaceType === effectiveType) || typeOptions[0]
  const guidance = selectedForm ? guidanceForForm(selectedForm.id, selectedForm.category) : null

  const handleCategoryChange = (nextId: RecordingSelectorCategoryId) => {
    setCategoryId(nextId)
    const nextForms = workspaceFormsForSelectorCategory(nextId, about)
    const first = nextForms[0]?.workspaceType || ''
    setSelectedType(first)
    if (first && onChange) onChange(first as RecordingWorkspaceType)
  }

  const handleTypeChange = (nextType: string) => {
    setSelectedType(nextType as RecordingWorkspaceType)
    if (onChange) onChange(nextType as RecordingWorkspaceType)
  }

  const startHref = selectedForm?.workspaceType
    ? recordStartHref(childId, selectedForm.workspaceType, selectedForm.id)
    : childId
      ? childRecordHref(childId)
      : '/record'

  const handleStart = () => {
    if (onChange && selectedForm?.workspaceType) {
      onChange(selectedForm.workspaceType)
      return
    }
    router.push(startHref)
  }

  return (
    <section
      data-testid="recording-type-selector"
      className={`rounded-[28px] border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/80 ${compact ? 'p-4' : 'p-5'}`}
    >
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">Recording</p>
        <h2 className={`font-black tracking-[-0.03em] text-slate-950 ${compact ? 'mt-1 text-lg' : 'mt-1 text-xl'}`}>
          What do you want to record?
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Choose a category, then the recording type. All forms remain available through browse-all.
        </p>
      </header>

      <div className={`mt-4 grid gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Category</span>
          <select
            data-testid="recording-selector-category"
            value={categoryId}
            onChange={(event) => handleCategoryChange(event.target.value as RecordingSelectorCategoryId)}
            className="mt-2 w-full min-h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {RECORDING_SELECTOR_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{category.description}</p>
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Recording type</span>
          <select
            data-testid="recording-selector-type"
            value={effectiveType}
            onChange={(event) => handleTypeChange(event.target.value)}
            className="mt-2 w-full min-h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {typeOptions.length === 0 ? (
              <option value="">No types in this category</option>
            ) : (
              typeOptions.map((form) => (
                <option key={form.id} value={form.workspaceType || form.id}>
                  {form.title}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {selectedForm && guidance ? (
        <div
          data-testid="recording-selector-guidance"
          className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm leading-6 text-slate-700"
        >
          <p className="font-black text-slate-950">{guidance.purpose}</p>
          <p className="mt-2 text-xs font-semibold text-slate-600">
            <span className="font-black text-slate-800">When to use: </span>
            {selectedForm.description}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-600">
            <span className="font-black text-slate-800">Include: </span>
            {guidance.adultGuidanceSections[0]?.goodRecordShouldInclude.join(' · ') || guidance.adultResponseGuidance}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
            {selectedForm.requiresManagerReview ? (
              <li className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Manager review likely</li>
            ) : (
              <li className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">Usually no manager review</li>
            )}
            {selectedForm.lifecycle && selectedForm.lifecycle.plan_impact_behaviour !== 'none' ? (
              <li className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-900">May affect plans</li>
            ) : null}
            {selectedForm.safeguardingSensitive ? (
              <li className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-900">Safeguarding sensitive</li>
            ) : null}
            <li className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              {routeStatusLabel(selectedForm.routeKind)}
            </li>
          </ul>
          {routeStatusMicrocopy(selectedForm.routeKind) ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">{routeStatusMicrocopy(selectedForm.routeKind)}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="recording-selector-start"
          onClick={handleStart}
          disabled={!selectedForm?.workspaceType}
          className="inline-flex min-h-11 items-center rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-sky-500/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start this record
        </button>
        {showBrowseAllLink ? (
          <Link
            href={childId ? `${childRecordHref(childId)}#browse-catalogue` : '/record#browse-catalogue'}
            data-testid="recording-selector-browse-all"
            className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
          >
            Browse all recording types
          </Link>
        ) : null}
      </div>
    </section>
  )
}
