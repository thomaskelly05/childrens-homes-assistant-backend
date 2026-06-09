'use client'

import { useMemo } from 'react'
import { Activity, AlertTriangle, Building2, Clock, PoundSterling, Sparkles, TrendingUp, Users } from 'lucide-react'

import { getFounderOrbContextSnapshot } from '@/lib/founder/orb-founder'

const contextItems = [
  { key: 'mrr', label: 'MRR', icon: PoundSterling, tone: 'text-emerald-300' },
  { key: 'activeUsers', label: 'Active users', icon: Users, tone: 'text-cyan-300' },
  { key: 'providers', label: 'Providers', icon: Building2, tone: 'text-slate-300' },
  { key: 'hoursReturned', label: 'Hours returned', icon: Clock, tone: 'text-violet-300' }
] as const

export function FounderOrbContextPanel() {
  const snapshot = useMemo(() => getFounderOrbContextSnapshot(), [])

  return (
    <aside className="founder-surface flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Founder Context</p>
        <p className="mt-1 text-xs text-slate-500">
          {snapshot.dataMode} intelligence snapshot
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {contextItems.map((item) => {
          const Icon = item.icon
          const value = snapshot[item.key]

          return (
            <div key={item.key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${item.tone}`} aria-hidden />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              </div>
              <p className="mt-2 text-xl font-black text-white">{value}</p>
            </div>
          )
        })}

        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Top recommendation</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-200">{snapshot.topRecommendation}</p>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Current risk</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-200">{snapshot.currentRisk}</p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-300" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Highest demand feature</p>
          </div>
          <p className="mt-2 text-lg font-bold text-white">{snapshot.highestDemandFeature}</p>
        </div>
      </div>

      {snapshot.dataMode !== 'Live' ? (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-xs leading-5 text-amber-200/90">
            Some figures are estimated or mocked. ORB Founder will not present them as verified live truth.
          </p>
        </div>
      ) : null}

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <Activity className="h-3.5 w-3.5" aria-hidden />
          <span>Powered by Founder Intelligence Layer</span>
        </div>
      </div>
    </aside>
  )
}
