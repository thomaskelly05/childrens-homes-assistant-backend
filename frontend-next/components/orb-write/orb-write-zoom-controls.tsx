'use client'

import { Maximize2, Minus, Plus } from 'lucide-react'

import {
  nextOrbWriteZoom,
  type OrbWriteZoomLevel,
  type OrbWriteZoomMode
} from '@/lib/orb/write/orb-write-zoom'

export function OrbWriteZoomControls({
  zoomMode,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onResetZoom
}: {
  zoomMode: OrbWriteZoomMode
  zoomPercent: OrbWriteZoomLevel
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
  onResetZoom: () => void
}) {
  const displayPercent = zoomMode === 'fit-width' ? 'Fit' : `${zoomPercent}%`

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-[var(--orb-line)]/50 bg-[var(--orb-surface)]/80 px-1 py-0.5"
      data-orb-write-zoom-controls
      role="group"
      aria-label="Document zoom"
    >
      <button
        type="button"
        className="rounded p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] disabled:opacity-40"
        onClick={onZoomOut}
        disabled={zoomPercent <= 75 && zoomMode === 'percent'}
        data-orb-write-zoom-out
        aria-label="Zoom out"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="min-w-[3rem] rounded px-1 py-1 text-[10px] font-medium tabular-nums text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
        onClick={onResetZoom}
        data-orb-write-zoom-percent
        aria-label={`Zoom ${displayPercent}`}
      >
        {displayPercent}
      </button>
      <button
        type="button"
        className="rounded p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] disabled:opacity-40"
        onClick={onZoomIn}
        disabled={zoomPercent >= 150 && zoomMode === 'percent'}
        data-orb-write-zoom-in
        aria-label="Zoom in"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span className="mx-0.5 h-4 w-px bg-[var(--orb-line)]/40" aria-hidden />
      <button
        type="button"
        className={`rounded p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] ${zoomMode === 'fit-width' ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]' : ''}`}
        onClick={onFitWidth}
        data-orb-write-zoom-fit-width
        aria-label="Fit width"
        title="Fit width"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={`rounded px-1.5 py-1 text-[10px] font-medium text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] ${zoomMode === 'percent' && zoomPercent === 100 ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]' : ''}`}
        onClick={onResetZoom}
        data-orb-write-zoom-100
        aria-label="100 percent zoom"
      >
        100%
      </button>
    </div>
  )
}

export function useOrbWriteZoomHandlers(
  zoomPercent: OrbWriteZoomLevel,
  zoomMode: OrbWriteZoomMode,
  setZoomPercent: (v: OrbWriteZoomLevel) => void,
  setZoomMode: (v: OrbWriteZoomMode) => void,
  persist: (pref: { mode: OrbWriteZoomMode; percent: OrbWriteZoomLevel }) => void
) {
  return {
    onZoomIn: () => {
      const next = nextOrbWriteZoom(zoomPercent, 'in')
      setZoomMode('percent')
      setZoomPercent(next)
      persist({ mode: 'percent', percent: next })
    },
    onZoomOut: () => {
      const next = nextOrbWriteZoom(zoomPercent, 'out')
      setZoomMode('percent')
      setZoomPercent(next)
      persist({ mode: 'percent', percent: next })
    },
    onFitWidth: () => {
      setZoomMode('fit-width')
      persist({ mode: 'fit-width', percent: zoomPercent })
    },
    onResetZoom: () => {
      setZoomMode('percent')
      setZoomPercent(100)
      persist({ mode: 'percent', percent: 100 })
    }
  }
}
