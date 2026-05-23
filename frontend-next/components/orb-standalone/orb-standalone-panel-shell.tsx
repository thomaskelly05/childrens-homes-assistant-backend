'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function OrbStandalonePanelShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  ariaLabel
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
}) {
  if (!open) return null

  return (
    <div
      className="orb-panel-overlay fixed inset-0 z-[65] flex justify-end bg-black/50 backdrop-blur-sm md:p-0"
      role="dialog"
      aria-label={ariaLabel || title}
      data-orb-panel-shell
    >
      <div className="orb-panel-drawer flex h-full w-full max-w-xl flex-col border-l border-white/[0.08] bg-[#0d1117] shadow-2xl max-md:max-h-[100dvh] md:max-h-[100dvh]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
            {subtitle ? <p className="truncate text-[11px] text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/[0.06]"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  )
}
