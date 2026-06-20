'use client'

import type { ReactNode } from 'react'

export const ORB_COMMUNICATE_SAFETY_BANNER =
  'ORB Communicate supports accessible communication and safer recording. It does not replace professional judgement, safeguarding procedures, SALT, PBS, clinical advice or local policy.'

export function OrbCommunicateSafetyBanner({ className = '' }: { className?: string }) {
  return (
    <aside
      className={`rounded-2xl border border-sky-400/20 bg-sky-500/5 px-4 py-3 text-sm leading-relaxed text-slate-300 [text-wrap:pretty] ${className}`}
      data-orb-communicate-safety-banner
      role="note"
    >
      {ORB_COMMUNICATE_SAFETY_BANNER}
    </aside>
  )
}

export function OrbCommunicateField({
  id,
  label,
  hint,
  children
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5" data-orb-communicate-field={id}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      {hint ? <p className="text-xs text-slate-400 [text-wrap:pretty]">{hint}</p> : null}
      {children}
    </div>
  )
}

export const orbCommunicateInputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20'

export const orbCommunicateSelectClass = orbCommunicateInputClass

export function OrbCommunicateSection({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2" data-orb-communicate-section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-400/90">{title}</h3>
      <div className="text-sm leading-relaxed text-slate-200 [text-wrap:pretty]">{children}</div>
    </section>
  )
}

export function OrbCommunicateSymbolPlaceholder({
  label,
  category
}: {
  label: string
  category: string
}) {
  const initials = label
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 p-3 text-center shadow-[0_0_24px_rgba(56,189,248,0.08)]"
      data-orb-communicate-symbol
      data-orb-communicate-symbol-category={category}
      role="img"
      aria-label={`Placeholder symbol for ${label}`}
    >
      <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sm font-semibold text-sky-200">
        {initials}
      </span>
      <span className="text-xs font-medium text-slate-100">{label}</span>
    </div>
  )
}

export function OrbCommunicatePreviewPanel({
  title,
  children,
  onBack,
  onCopy
}: {
  title: string
  children: ReactNode
  onBack?: () => void
  onCopy?: () => void
}) {
  return (
    <div
      className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      data-orb-communicate-preview
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex gap-2">
          {onCopy ? (
            <button
              type="button"
              onClick={onCopy}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/5"
            >
              Copy
            </button>
          ) : null}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/5"
            >
              Edit inputs
            </button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  )
}
