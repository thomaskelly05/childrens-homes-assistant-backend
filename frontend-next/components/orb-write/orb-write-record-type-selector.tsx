'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  ORB_PRIMARY_RECORD_TYPE_IDS,
  resolveOrbRecordingRecordType
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'

/** Compact record-type selector for mobile ORB Write — opens shared framework list. */
export function OrbWriteRecordTypeSelector({
  recordTypeId,
  onSelect,
  onOpenFullPicker,
  variant = 'compact',
  selectorLabel = 'Record type'
}: {
  recordTypeId: string
  onSelect?: (recordType: OrbRecordingRecordType) => void
  onOpenFullPicker?: () => void
  variant?: 'compact' | 'badge'
  selectorLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = resolveOrbRecordingRecordType({ recordTypeId })

  const options = ORB_PRIMARY_RECORD_TYPE_IDS.map((id) => resolveOrbRecordingRecordType({ recordTypeId: id }))

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function handleSelect(recordType: OrbRecordingRecordType) {
    onSelect?.(recordType)
    setOpen(false)
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-[var(--orb-line)]/50 px-2 py-0.5 font-medium text-[var(--orb-foreground)]"
        data-orb-write-record-type-selector
        data-orb-write-template-selector
        data-orb-write-record-type-badge
        onClick={() => (onOpenFullPicker ? onOpenFullPicker() : setOpen((v) => !v))}
        aria-expanded={open}
      >
        <span className="text-[10px] text-[var(--orb-muted)]">{selectorLabel}:</span>
        <span className="truncate">{current.label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      </button>
    )
  }

  return (
    <div ref={rootRef} className="relative min-w-0" data-orb-write-record-type-selector data-orb-write-template-selector>
      <button
        type="button"
        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)]/50 px-2 py-1 text-left text-[11px] font-semibold text-[var(--orb-foreground)]"
        data-orb-write-record-type-trigger
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (onOpenFullPicker ? onOpenFullPicker() : setOpen((v) => !v))}
      >
        <span className="text-[10px] font-medium text-[var(--orb-muted)]">{selectorLabel}:</span>
        <span className="truncate" data-orb-write-record-type-label>
          {current.label}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && !onOpenFullPicker ? (
        <div
          className="absolute left-0 top-full z-40 mt-1 max-h-[min(18rem,45dvh)] w-[min(100vw-2rem,16rem)] overflow-y-auto rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-1 shadow-lg"
          role="listbox"
          aria-label="Record types"
          data-orb-write-record-type-menu
        >
          {options.map((recordType) => (
            <button
              key={recordType.id}
              type="button"
              role="option"
              aria-selected={recordType.id === current.id}
              data-orb-write-record-type-option={recordType.id}
              className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition ${
                recordType.id === current.id
                  ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                  : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
              }`}
              onClick={() => handleSelect(recordType)}
            >
              <span className="text-[11px] font-semibold">{recordType.label}</span>
              <span className="mt-0.5 line-clamp-1 text-[10px] opacity-80">{recordType.purpose}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
