'use client'

import { CheckCircle2, CircleDashed, Database, Info, MinusCircle } from 'lucide-react'

import {
  FOUNDER_DATA_SOURCE_LABELS,
  formatSourceConnectionStatus,
  type FounderDataSourceKey
} from '@/lib/founder/data/founder-data-source'
import { formatFounderSourceModeLabel } from '@/lib/founder/data/founder-data-mode'
import type { FounderDataSourceStatus } from '@/lib/founder/data/founder-live-metrics'

const SOURCE_KEYS: FounderDataSourceKey[] = [
  'users',
  'providers',
  'homes',
  'orbConversations',
  'featureEvents',
  'billing',
  'aiUsage',
  'readiness'
]

type FounderDataStatusCardProps = {
  status: FounderDataSourceStatus
}

function SourceStatusIcon({ connection }: { connection: FounderDataSourceStatus['sourceConnections'][FounderDataSourceKey] }) {
  if (connection === 'connected') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
  }
  if (connection === 'no-records') {
    return <MinusCircle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
  }
  return <CircleDashed className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
}

export function FounderDataStatusCard({ status }: FounderDataStatusCardProps) {
  const isLiveOnly = status.source === 'live-only'

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10">
          <Database className="h-5 w-5 text-cyan-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Founder Data Status</p>
          <p className="mt-1 text-lg font-bold text-white">
            Data mode: <span className="text-cyan-200">{formatFounderSourceModeLabel(status.source)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Updated {new Date(status.generatedAt).toLocaleString('en-GB')}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Data sources</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SOURCE_KEYS.map((key) => {
            const connection = status.sourceConnections[key]
            const label = formatSourceConnectionStatus(connection)
            const tone =
              connection === 'connected'
                ? 'text-slate-200'
                : connection === 'no-records'
                  ? 'text-amber-200/80'
                  : 'text-slate-500'

            return (
              <li
                key={key}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <SourceStatusIcon connection={connection} />
                  <span className={tone}>{FOUNDER_DATA_SOURCE_LABELS[key]}</span>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${tone}`}>{label}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {isLiveOnly ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
          <p className="text-sm leading-6 text-slate-300">
            Live-only mode is active. Missing sources show honest empty states — no estimated or mock business metrics.
          </p>
        </div>
      ) : null}
    </div>
  )
}
