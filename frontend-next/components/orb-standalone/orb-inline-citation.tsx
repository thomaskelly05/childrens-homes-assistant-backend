'use client'

import { useState } from 'react'

import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'

export function OrbInlineCitation({ source }: { source: StandaloneOrbSource }) {
  const [open, setOpen] = useState(false)
  const anchor = source.label || 'Source'
  const short = anchor.length > 28 ? `${anchor.slice(0, 26)}…` : anchor

  return (
    <span className="relative inline-block align-baseline">
      <button
        type="button"
        className="mx-0.5 inline-flex items-center rounded-md border border-cyan-400/25 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-100/95 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
      >
        [{short}]
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0c1018] p-3 text-left shadow-xl"
        >
          <p className="text-xs font-semibold text-white">{anchor}</p>
          {source.basis ? <p className="mt-1.5 text-[11px] leading-5 text-slate-400">{source.basis}</p> : null}
          {source.note && source.note !== source.basis ? (
            <p className="mt-1 text-[10px] text-slate-500">{source.note}</p>
          ) : null}
          <p className="mt-2 text-[9px] uppercase tracking-wide text-slate-600">
            {source.type?.replace(/_/g, ' ') || 'institutional guidance'}
          </p>
        </span>
      ) : null}
    </span>
  )
}

/** Split answer text and interleave citation chips where [Label] anchors appear. */
export function renderAnswerWithCitations(content: string, sources?: StandaloneOrbSource[]) {
  if (!content.trim()) return null
  const sourceByLabel = new Map<string, StandaloneOrbSource>()
  for (const source of sources ?? []) {
    const key = (source.label || '').trim()
    if (key) sourceByLabel.set(key.toLowerCase(), source)
  }

  const parts = content.split(/(\[[^\]]+\])/g)
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]$/)
    if (!match) {
      return (
        <span key={`t-${index}`} className="whitespace-pre-wrap">
          {part}
        </span>
      )
    }
    const label = match[1]
    const source = sourceByLabel.get(label.toLowerCase()) ?? {
      label,
      type: 'regulatory_framework',
      basis: 'Institutional guidance anchor referenced in this response.'
    }
    return <OrbInlineCitation key={`c-${index}-${label}`} source={source} />
  })
}
