'use client'

import {
  BookOpen,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  X,
  type LucideIcon
} from 'lucide-react'

import {
  RESIDENTIAL_AGENTS,
  type ResidentialAgentDefinition,
  type ResidentialAgentId
} from '@/lib/orb/residential-agents'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

const AGENT_ICONS: Record<ResidentialAgentId, LucideIcon> = {
  ask_orb: Sparkles,
  safeguarding_thinking: Shield,
  ofsted_lens: ClipboardCheck,
  record_properly: FileText,
  therapeutic_reframe: HeartHandshake,
  manager_copilot: Users,
  staff_coach: MessageCircle,
  reg44_reg45_prep: BookOpen
}

const AGENT_ACCENT: Record<ResidentialAgentId, string> = {
  ask_orb: '#00B8FF',
  safeguarding_thinking: '#F43F5E',
  ofsted_lens: '#A78BFA',
  record_properly: '#34D399',
  therapeutic_reframe: '#FBBF24',
  manager_copilot: '#60A5FA',
  staff_coach: '#818CF8',
  reg44_reg45_prep: '#38BDF8'
}

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
      className="orb-panel-overlay fixed inset-0 z-[72] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-label="Residential agents"
    >
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[var(--orb-line)] px-5 py-4">
          <div>
            <p className="orb-electric-text text-[10px] uppercase tracking-[0.2em]">Residential agents</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--orb-foreground)]">Choose an agent</h2>
            <p className="mt-1 text-xs text-[var(--orb-muted)]">Each agent adjusts tone, placeholders and cognition focus.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
            aria-label="Close agents"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="grid flex-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4">
          {RESIDENTIAL_AGENTS.map((agent) => {
            const active = modesMatch(activeMode, agent.mode)
            const Icon = AGENT_ICONS[agent.id]
            const accent = AGENT_ACCENT[agent.id]
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(agent)
                    onClose()
                  }}
                  className={`orb-agent-card flex w-full gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${agent.atmosphereClass} ${
                    active
                      ? 'border-[#00B8FF] bg-[#EAF6FF] ring-1 ring-[#00B8FF]/30'
                      : 'border-[var(--orb-line)] bg-[var(--orb-surface)] hover:border-[#CBD5E1] hover:bg-[var(--orb-surface-hover)]'
                  }`}
                  data-orb-agent={agent.id}
                  aria-current={active ? 'true' : undefined}
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${accent}14`, color: accent }}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--orb-foreground)]">{agent.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--orb-muted)]">{agent.subtitle}</p>
                    <p className="mt-2 text-[10px] font-medium text-[var(--orb-muted)]">Using · {agent.cognitionLabel}</p>
                  </span>
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
