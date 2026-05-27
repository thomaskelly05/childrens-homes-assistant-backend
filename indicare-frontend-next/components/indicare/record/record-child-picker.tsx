'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useRef } from 'react'
import { ChevronDown, UsersRound } from 'lucide-react'

import type { OsPersonSummary } from '@/lib/os-api/workspaces'
import { youngPersonDisplayName, youngPersonStatusLine } from '@/lib/record/recording-hub'

export type RecordChildPickerOption = {
  id: string
  name: string
  statusLine: string
}

export function mapYoungPeopleToPickerOptions(people: OsPersonSummary[]): RecordChildPickerOption[] {
  return people
    .filter((person) => person.id)
    .map((person) => ({
      id: person.id,
      name: youngPersonDisplayName(person),
      statusLine: youngPersonStatusLine(person)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export function RecordChildPicker({
  options,
  selectedId,
  onSelect,
  loadError,
  loadWarning,
  isLoading,
  onRetry
}: {
  options: RecordChildPickerOption[]
  selectedId?: string
  onSelect: (option: RecordChildPickerOption) => void
  loadError?: boolean
  loadWarning?: string
  isLoading?: boolean
  onRetry?: () => void
}) {
  const selectId = useId()
  const selectRef = useRef<HTMLSelectElement>(null)
  const selected = useMemo(() => options.find((option) => option.id === selectedId), [options, selectedId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#choose-child') return
    selectRef.current?.focus()
  }, [])

  if (loadError) {
    return (
      <section
        id="choose-child"
        data-testid="record-child-picker-error"
        className="rounded-[28px] border border-amber-100 bg-amber-50/90 p-5 text-sm font-semibold leading-6 text-amber-950"
        aria-live="polite"
      >
        <p>Children could not be loaded. You can still open the children list.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/young-people"
            className="inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Choose child
          </Link>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black text-amber-950"
            >
              Try again
            </button>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section
      id="choose-child"
      data-testid="record-child-picker"
      className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <UsersRound className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={selectId} className="text-sm font-black text-slate-950">
            Choose child
          </label>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            Select who this record is about. Journey-linked records will open on their profile.
          </p>
        </div>
      </div>

      {loadWarning ? (
        <p className="mt-3 text-xs font-bold text-amber-800" role="status">
          {loadWarning}
        </p>
      ) : null}

      <div className="relative mt-4">
        <select
          ref={selectRef}
          id={selectId}
          data-testid="record-child-select"
          value={selectedId || ''}
          disabled={isLoading || !options.length}
          onChange={(event) => {
            const option = options.find((item) => item.id === event.target.value)
            if (option) onSelect(option)
          }}
          className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
          aria-describedby={selected ? `${selectId}-selected` : undefined}
        >
          <option value="">{isLoading ? 'Loading children…' : 'Select a young person'}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.statusLine ? ` — ${option.statusLine}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>

      {selected ? (
        <p id={`${selectId}-selected`} className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-950" data-testid="record-child-picker-selected">
          Recording for <span className="font-black">{selected.name}</span>
          {selected.statusLine ? <span className="block text-xs font-bold text-emerald-800/90">{selected.statusLine}</span> : null}
        </p>
      ) : (
        <p className="mt-3 text-xs font-bold text-slate-500">Child-specific cards stay on this page until you pick who the record is about.</p>
      )}

      {!options.length && !isLoading ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/young-people" className="inline-flex min-h-11 items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">
            Open children list
          </Link>
        </div>
      ) : null}
    </section>
  )
}
