'use client'

import { CheckCircle2, CircleDashed, Database, Info } from 'lucide-react'

import {
  FOUNDER_DATA_SOURCE_LABELS,
  type FounderDataSourceKey
} from '@/lib/founder/data/founder-data-source'
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

const AVAILABILITY_FIELD: Record<
  FounderDataSourceKey,
  keyof FounderDataSourceStatus['availability']
> = {
  users: 'usersAvailable',
  providers: 'providersAvailable',
  homes: 'homesAvailable',
  orbConversations: 'orbConversationsAvailable',
  featureEvents: 'featureEventsAvailable',
  billing: 'billingAvailable',
  aiUsage: 'aiUsageAvailable',
  readiness: 'readinessAvailable'
}

function formatSourceMode(source: FounderDataSourceStatus['source']) {
  if (source === 'live') return 'Live'
  if (source === 'hybrid') return 'Hybrid'
  return 'Mock'
}

type FounderDataStatusCardProps = {
  status: FounderDataSourceStatus
}

export function FounderDataStatusCard({ status }: FounderDataStatusCardProps) {
  const showEstimateNotice = status.source !== 'live'

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10">
          <Database className="h-5 w-5 text-cyan-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Founder Data Status</p>
          <p className="mt-1 text-lg font-bold text-white">
            Data mode: <span className="text-cyan-200">{formatSourceMode(status.source)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Updated {new Date(status.generatedAt).toLocaleString('en-GB')}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Sources connected</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SOURCE_KEYS.map((key) => {
            const connected = status.availability[AVAILABILITY_FIELD[key]]
            return (
              <li
                key={key}
                className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                {connected ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                ) : (
                  <CircleDashed className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
                )}
                <span className={connected ? 'text-slate-200' : 'text-slate-500'}>
                  {FOUNDER_DATA_SOURCE_LABELS[key]}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {showEstimateNotice ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <p className="text-sm leading-6 text-slate-300">
            Some founder intelligence is currently estimated or mocked until live data sources are connected.
          </p>
        </div>
      ) : null}
    </div>
  )
}
