'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_PANEL_LAYOUT,
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

export function OrbResizableWorkspace({
  left,
  right,
  preview,
  showPreview = false,
  compactPresets = false,
  className = ''
}: {
  left: React.ReactNode
  right: React.ReactNode
  preview?: React.ReactNode
  showPreview?: boolean
  compactPresets?: boolean
  className?: string
}) {
  const [layout, setLayout] = useState<OrbDictatePanelLayout>(DEFAULT_PANEL_LAYOUT)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'main' | 'preview' | null>(null)

  useEffect(() => {
    setLayout(loadOrbDictatePanelLayout())
  }, [])

  const applyLayout = useCallback((next: OrbDictatePanelLayout) => {
    setLayout(next)
    saveOrbDictatePanelLayout(next)
  }, [])

  const applyPreset = useCallback(
    (preset: OrbDictatePanelPreset) => {
      applyLayout(PANEL_PRESET_LAYOUTS[preset])
    },
    [applyLayout]
  )

  const onPointerDownMain = useCallback(
    (e: React.PointerEvent) => {
      if (layout.preset === 'full-transcript' || layout.preset === 'full-brain' || layout.preset === 'full-preview') return
      draggingRef.current = 'main'
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [layout.preset]
  )

  const onPointerMoveMain = useCallback(
    (e: React.PointerEvent) => {
      if (draggingRef.current !== 'main' || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      const leftPercent = Math.min(85, Math.max(15, pct))
      applyLayout({
        ...layout,
        leftPercent,
        rightPercent: 100 - leftPercent,
        preset: '50-50'
      })
    },
    [applyLayout, layout]
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  const leftHidden = layout.preset === 'full-brain' || layout.preset === 'full-preview'
  const rightHidden = layout.preset === 'full-transcript' || layout.preset === 'full-preview'
  const previewFull = layout.preset === 'full-preview' || showPreview

  const presetToolbar = (
    <div className="flex flex-wrap items-center gap-1" data-orb-panel-presets role="toolbar" aria-label="Panel layout presets">
      {(Object.keys(PRESET_LABELS) as OrbDictatePanelPreset[]).map((preset) => (
        <button
          key={preset}
          type="button"
          data-orb-panel-preset={preset}
          aria-pressed={layout.preset === preset}
          className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition ${
            layout.preset === preset
              ? 'border-[var(--orb-primary)]/50 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
              : 'border-[var(--orb-line)]/50 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
          }`}
          onClick={() => applyPreset(preset)}
        >
          {PRESET_LABELS[preset]}
        </button>
      ))}
    </div>
  )

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-1.5 ${className}`}
      data-orb-resizable-workspace
    >
      {compactPresets ? (
        <details className="shrink-0 text-[10px]" data-orb-panel-presets-compact>
          <summary className="cursor-pointer font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
            Panel layout
          </summary>
          <div className="mt-1">{presetToolbar}</div>
        </details>
      ) : (
        presetToolbar
      )}

      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row"
        style={{ minHeight: 'min(62svh, calc(100dvh - 16rem))' }}
      >
        {!leftHidden ? (
          <section
            className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] shadow-sm"
            style={{ flex: previewFull && showPreview ? undefined : `0 0 ${layout.leftPercent}%` }}
            data-orb-panel-left
          >
            {left}
          </section>
        ) : null}

        {!leftHidden && !rightHidden ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            tabIndex={0}
            data-orb-panel-divider
            className="hidden w-1.5 shrink-0 cursor-col-resize rounded-full bg-[var(--orb-line)]/40 hover:bg-[var(--orb-primary)]/40 lg:block"
            onPointerDown={onPointerDownMain}
            onPointerMove={onPointerMoveMain}
            onPointerUp={onPointerUp}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft')
                applyLayout({
                  ...layout,
                  leftPercent: Math.max(15, layout.leftPercent - 5),
                  rightPercent: Math.min(85, layout.rightPercent + 5),
                  preset: '50-50'
                })
              if (e.key === 'ArrowRight')
                applyLayout({
                  ...layout,
                  leftPercent: Math.min(85, layout.leftPercent + 5),
                  rightPercent: Math.max(15, layout.rightPercent - 5),
                  preset: '50-50'
                })
            }}
          />
        ) : null}

        {!rightHidden ? (
          <section
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] shadow-sm"
            data-orb-panel-right
          >
            {right}
          </section>
        ) : null}
      </div>

      {showPreview && preview ? (
        <section
          className="flex max-h-[28%] min-h-[6rem] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] lg:max-h-[24%]"
          data-orb-panel-preview
        >
          {preview}
        </section>
      ) : null}
    </div>
  )
}
