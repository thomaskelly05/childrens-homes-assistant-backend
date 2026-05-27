'use client'

import { X } from 'lucide-react'

import {
  RESIDENTIAL_AGENTS,
  type ResidentialAgentDefinition,
  type ResidentialAgentId
} from '@/lib/orb/residential-agents'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export function OrbResidentialAgentsPanel({
  open,
  activeMode,
  onSelect,
  onClose
}: {
  open: boolean
  activeMode: string
  onSelect: (agent: ResidentialAgentDefinition) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[72] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-label="Residential agents"
    >
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#080a12] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200/80">Residential agents</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Choose a cognition workspace</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Close agents"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-3 sm:p-4">
          {RESIDENTIAL_AGENTS.map((agent) => {
            const active = modesMatch(activeMode, agent.mode)
            return (
              <li key={agent.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(agent)
                    onClose()
                  }}
                  className={`orb-agent-card w-full rounded-2xl border px-4 py-4 text-left transition ${agent.atmosphereClass} ${
                    active
                      ? 'border-cyan-300/35 bg-cyan-300/[0.08] ring-1 ring-cyan-300/25'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
                  }`}
                  data-orb-agent={agent.id}
                  aria-current={active ? 'true' : undefined}
                >
                  <p className="text-sm font-semibold text-white">{agent.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{agent.subtitle}</p>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Using · {agent.cognitionLabel}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function modesMatch(active: string, mode: StandaloneOrbMode): boolean {
  return active.trim().toLowerCase() === mode.trim().toLowerCase()
}

export function resolveAgentIdFromMode(mode: string): ResidentialAgentId {
  const match = RESIDENTIAL_AGENTS.find((a) => a.mode.toLowerCase() === mode.trim().toLowerCase())
  return match?.id ?? 'ask_orb'
}
