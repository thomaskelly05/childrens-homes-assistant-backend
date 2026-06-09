'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

import type { FounderActivityItem } from '@/lib/founder/mock-data'

const categoryTone: Record<string, string> = {
  Inspection: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  Reporting: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  Dictate: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  Risk: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  Safeguarding: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  Export: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
  Chronology: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200',
  'Key Work': 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
}

export function FounderActivityFeed({ items }: { items: FounderActivityItem[] }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setPulse((value) => !value), 2400)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        <span className={`inline-flex h-2 w-2 rounded-full bg-emerald-400 transition ${pulse ? 'opacity-100 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'opacity-40'}`} />
        Live feed · anonymised activity only
      </div>
      <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 transition hover:border-white/15 hover:bg-white/[0.04]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Activity className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden />
                <span>{item.time}</span>
                <span className="text-slate-600">·</span>
                <span className="font-semibold text-slate-300">{item.role}</span>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${categoryTone[item.category] || 'border-slate-400/30 bg-slate-500/10 text-slate-200'}`}>
                {item.category}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{item.action}</p>
            <p className="mt-1 text-xs text-slate-500">{item.region}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
