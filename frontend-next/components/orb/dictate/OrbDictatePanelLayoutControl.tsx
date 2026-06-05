'use client'

import { LayoutGrid } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  loadOrbDictatePanelLayout,
  PANEL_PRESET_LAYOUTS,
  saveOrbDictatePanelLayout,
  type OrbDictatePanelLayout,
  type OrbDictatePanelPreset
} from '@/lib/orb/dictate/orb-dictate-panel-layout'

const PRESET_LABELS: Record<OrbDictatePanelPreset, string> = {
  '70-30': '70/30',
  '50-50': '50/50',
  '30-70': '30/70',
  'full-transcript': 'Transcript',
  'full-brain': 'Brain',
  'full-preview': 'Preview'
}

export function OrbDictatePanelLayoutControl({
  layout,
  onLayoutChange
}: {
  layout: OrbDictatePanelLayout
  onLayoutChange: (layout: OrbDictatePanelLayout) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const applyPreset = useCallback(
    (preset: OrbDictatePanelPreset) => {
      const next = PANEL_PRESET_LAYOUTS[preset]
      onLayoutChange(next)
      saveOrbDictatePanelLayout(next)
      setOpen(false)
    },
    [onLayoutChange]
  )

  const activeLabel = PRESET_LABELS[layout.preset] ?? 'Layout'

  return (
    <div className="relative" ref={rootRef} data-orb-dictate-layout-control>
      <button
        type="button"
        data-orb-dictate-layout-toggle
        aria-expanded={open}
        aria-haspopup="menu"
        title="Panel layout presets"
        className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--orb-line)]/45 px-2.5 text-[11px] font-medium text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
        onClick={() => setOpen((v) => !v)}
      >
        <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden sm:inline">{activeLabel}</span>
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-1.5 shadow-lg"
          role="menu"
          data-orb-panel-presets
        >
          {(Object.keys(PRESET_LABELS) as OrbDictatePanelPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              role="menuitem"
              data-orb-panel-preset={preset}
              aria-pressed={layout.preset === preset}
              className={`flex w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition ${
                layout.preset === preset
                  ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                  : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
              }`}
              onClick={() => applyPreset(preset)}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function useOrbDictatePanelLayout() {
  const [layout, setLayout] = useState<OrbDictatePanelLayout>(() => loadOrbDictatePanelLayout())

  useEffect(() => {
    setLayout(loadOrbDictatePanelLayout())
  }, [])

  const updateLayout = useCallback((next: OrbDictatePanelLayout) => {
    setLayout(next)
    saveOrbDictatePanelLayout(next)
  }, [])

  return { layout, updateLayout }
}
