'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Bot,
  ClipboardList,
  FileText,
  Lock,
  Map,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Wrench
} from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

type ToolBadge = 'Built' | 'Standalone' | 'Requires OS context' | 'Privacy safe'

type ToolCard = {
  id: string
  label: string
  description: string
  badge: ToolBadge
  icon: ReactNode
  onClick?: () => void
  pinned?: boolean
}

type OsTool = {
  id: string
  label: string
  description: string
  href: string
}

const OS_TOOLS: OsTool[] = [
  { id: 'os-orb', label: 'OS ORB', description: 'Operational assistant with live context', href: '/assistant/orb' },
  { id: 'care-hub', label: 'Care Hub', description: 'OS command centre', href: '/care-hub' },
  { id: 'record', label: 'Record', description: 'Child-centred recording', href: '/record' },
  { id: 'actions', label: 'Intelligence Actions', description: 'Oversight and follow-through', href: '/actions' },
  { id: 'governance', label: 'AI Governance', description: 'Oversight and compliance', href: '/governance' },
  { id: 'privacy', label: 'Privacy Governance', description: 'Privacy guardrails and retention', href: '/governance/privacy' }
]

function badgeClass(badge: ToolBadge): string {
  if (badge === 'Built') return 'bg-emerald-500/10 text-emerald-200/90 ring-emerald-400/20'
  if (badge === 'Standalone') return 'bg-cyan-500/10 text-cyan-200/90 ring-cyan-400/20'
  if (badge === 'Privacy safe') return 'bg-violet-500/10 text-violet-200/90 ring-violet-400/20'
  return 'bg-amber-500/10 text-amber-200/90 ring-amber-400/20'
}

function ToolCardButton({
  tool,
  onSelect
}: {
  tool: ToolCard
  onSelect: (tool: ToolCard) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tool)}
      className="orb-panel-card flex w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300/40"
      data-orb-tool-card={tool.id}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-cyan-300/90">
        {tool.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-slate-100">{tool.label}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ring-1 ${badgeClass(tool.badge)}`}>
            {tool.badge}
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{tool.description}</span>
      </span>
    </button>
  )
}

function ToolSection({ title, tools, onSelect }: { title: string; tools: ToolCard[]; onSelect: (tool: ToolCard) => void }) {
  if (!tools.length) return null
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{title}</h3>
      <ul className="mt-2 grid gap-2">
        {tools.map((tool) => (
          <li key={tool.id}>
            <ToolCardButton tool={tool} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function OrbToolsPanel({
  open,
  onClose,
  onOpenKnowledge,
  onOpenDocuments,
  onOpenAgents,
  onOpenSavedOutputs,
  onOpenMemory,
  onOpenIntelligenceMap,
  onOpenAccessibility,
  onOpenPermissions,
  onRunDeepResearch,
  onAskOrb
}: {
  open: boolean
  onClose: () => void
  onOpenKnowledge?: () => void
  onOpenDocuments?: () => void
  onOpenAgents?: () => void
  onOpenSavedOutputs?: () => void
  onOpenMemory?: () => void
  onOpenIntelligenceMap?: () => void
  onOpenAccessibility?: () => void
  onOpenPermissions?: () => void
  onRunDeepResearch?: () => void
  onAskOrb?: () => void
}) {
  const [query, setQuery] = useState('')

  const startTools: ToolCard[] = [
    {
      id: 'ask',
      label: 'Ask ORB',
      description: 'Return to chat',
      badge: 'Standalone',
      icon: <MessageSquare className="h-4 w-4" aria-hidden />,
      onClick: onAskOrb,
      pinned: true
    }
  ]

  const primaryTools: ToolCard[] = [
    {
      id: 'documents',
      label: 'Documents',
      description: 'Upload, paste and analyse standalone documents',
      badge: 'Standalone',
      icon: <FileText className="h-4 w-4" aria-hidden />,
      onClick: onOpenDocuments,
      pinned: true
    },
    {
      id: 'deep-research',
      label: 'Deep Research',
      description: 'Multi-step research with citations',
      badge: 'Built',
      icon: <Search className="h-4 w-4" aria-hidden />,
      onClick: onRunDeepResearch ?? onOpenAgents,
      pinned: true
    },
    {
      id: 'agents',
      label: 'Agents',
      description: 'Specialist ORB agents for care support',
      badge: 'Built',
      icon: <Bot className="h-4 w-4" aria-hidden />,
      onClick: onOpenAgents,
      pinned: true
    },
    {
      id: 'knowledge',
      label: 'Knowledge Library',
      description: 'Search and govern reference sources',
      badge: 'Built',
      icon: <BookOpen className="h-4 w-4" aria-hidden />,
      onClick: onOpenKnowledge,
      pinned: true
    },
    {
      id: 'outputs',
      label: 'Saved Outputs',
      description: 'Your saved standalone artefacts',
      badge: 'Standalone',
      icon: <ClipboardList className="h-4 w-4" aria-hidden />,
      onClick: onOpenSavedOutputs,
      pinned: true
    }
  ]

  const researchTools: ToolCard[] = [
    {
      id: 'policy',
      label: 'Policy comparison',
      description: 'Compare uploaded policies',
      badge: 'Built',
      icon: <FileText className="h-4 w-4" aria-hidden />,
      onClick: onOpenDocuments
    }
  ]

  const careTools: ToolCard[] = [
    {
      id: 'recording',
      label: 'Record wording helper',
      description: 'Daily notes and incident wording',
      badge: 'Privacy safe',
      icon: <Sparkles className="h-4 w-4" aria-hidden />,
      onClick: onAskOrb
    },
    {
      id: 'action-plan',
      label: 'Action plan generator',
      description: 'From documents or agents',
      badge: 'Built',
      icon: <ClipboardList className="h-4 w-4" aria-hidden />,
      onClick: onOpenDocuments
    },
    {
      id: 'manager-brief',
      label: 'Manager briefing',
      description: 'Draft manager-ready briefings',
      badge: 'Built',
      icon: <Bot className="h-4 w-4" aria-hidden />,
      onClick: onOpenAgents
    },
    {
      id: 'staff-brief',
      label: 'Staff briefing',
      description: 'Shift handover support',
      badge: 'Built',
      icon: <Bot className="h-4 w-4" aria-hidden />,
      onClick: onOpenAgents
    },
    {
      id: 'safeguarding',
      label: 'Safeguarding reflection',
      description: 'Think through concerns safely',
      badge: 'Privacy safe',
      icon: <Shield className="h-4 w-4" aria-hidden />,
      onClick: onOpenAgents
    },
    {
      id: 'ofsted',
      label: 'Ofsted lens',
      description: 'Evidence and expectations support',
      badge: 'Built',
      icon: <Search className="h-4 w-4" aria-hidden />,
      onClick: onOpenAgents
    }
  ]

  const systemTools: ToolCard[] = [
    {
      id: 'memory',
      label: 'Memory',
      description: 'Local workspace preferences',
      badge: 'Standalone',
      icon: <Sparkles className="h-4 w-4" aria-hidden />,
      onClick: onOpenMemory
    },
    {
      id: 'a11y',
      label: 'Accessibility',
      description: 'Reading and sensory options',
      badge: 'Standalone',
      icon: <Sparkles className="h-4 w-4" aria-hidden />,
      onClick: onOpenAccessibility
    },
    {
      id: 'permissions',
      label: 'Permissions',
      description: 'Mic, camera and upload readiness',
      badge: 'Standalone',
      icon: <Lock className="h-4 w-4" aria-hidden />,
      onClick: onOpenPermissions
    },
    {
      id: 'map',
      label: 'Intelligence map',
      description: 'Capability parity view',
      badge: 'Built',
      icon: <Map className="h-4 w-4" aria-hidden />,
      onClick: onOpenIntelligenceMap
    }
  ]

  const allTools = useMemo(
    () => [...startTools, ...primaryTools, ...researchTools, ...careTools, ...systemTools],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable tool definitions
    []
  )

  const normalizedQuery = query.trim().toLowerCase()

  function filterTools(tools: ToolCard[]): ToolCard[] {
    if (!normalizedQuery) return tools
    return tools.filter(
      (tool) =>
        tool.label.toLowerCase().includes(normalizedQuery) ||
        tool.description.toLowerCase().includes(normalizedQuery)
    )
  }

  const pinned = filterTools(primaryTools.filter((t) => t.pinned))
  const start = filterTools(startTools)
  const research = filterTools([
    ...primaryTools.filter((t) => t.id === 'documents' || t.id === 'deep-research' || t.id === 'agents'),
    ...researchTools
  ])
  const care = filterTools(careTools)
  const library = filterTools(primaryTools.filter((t) => t.id === 'knowledge' || t.id === 'outputs'))
  const system = filterTools(systemTools)

  const osFiltered = normalizedQuery
    ? OS_TOOLS.filter(
        (tool) =>
          tool.label.toLowerCase().includes(normalizedQuery) ||
          tool.description.toLowerCase().includes(normalizedQuery) ||
          'operational'.includes(normalizedQuery)
      )
    : OS_TOOLS

  function pickTool(tool: ToolCard) {
    tool.onClick?.()
    onClose()
  }

  const showPinned = pinned.length > 0 && !normalizedQuery

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Tools"
      subtitle="Standalone capabilities — /orb/standalone/* only"
      onClose={onClose}
      ariaLabel="ORB tools"
      panelId="tools"
      footer="Standalone ORB does not access IndiCare OS records."
    >
      <div className="space-y-5 p-4" data-orb-tools-panel>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-200/80">
          <Wrench className="h-3.5 w-3.5" aria-hidden />
          IndiCare Tools
        </p>

        <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06] focus-within:ring-cyan-300/30">
          <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            data-orb-tools-search
          />
        </label>

        {showPinned ? (
          <section data-orb-tools-pinned>
            <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Pinned / recommended</h3>
            <ul className="mt-2 grid gap-2">
              {pinned.map((tool) => (
                <li key={`pinned-${tool.id}`}>
                  <ToolCardButton tool={tool} onSelect={pickTool} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ToolSection title="Start" tools={normalizedQuery ? start : startTools} onSelect={pickTool} />
        <ToolSection title="Documents & research" tools={normalizedQuery ? research : research} onSelect={pickTool} />
        <ToolSection title="Care support" tools={normalizedQuery ? care : careTools} onSelect={pickTool} />
        <ToolSection title="Library & saved work" tools={normalizedQuery ? library : library} onSelect={pickTool} />
        <ToolSection title="Settings & safety" tools={normalizedQuery ? system : systemTools} onSelect={pickTool} />
        {normalizedQuery && filterTools(allTools).length === 0 && osFiltered.length === 0 ? (
          <p className="text-sm text-slate-500">No tools match your search.</p>
        ) : null}

        <section>
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Operational OS links</h3>
          <p className="mt-1 text-xs leading-5 text-amber-200/75">
            Requires IndiCare OS context — navigation only, no OS API calls from standalone ORB.
          </p>
          <ul className="mt-3 grid gap-2">
            {osFiltered.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={tool.href}
                  onClick={onClose}
                  className="orb-panel-card flex w-full items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 text-left transition hover:border-violet-300/25 hover:bg-violet-400/[0.04]"
                  data-orb-os-link={tool.id}
                >
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-300/80" aria-hidden />
                  <span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-200">{tool.label}</span>
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-200/90 ring-1 ring-amber-400/20">
                        Requires OS context
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{tool.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </OrbStandalonePanelShell>
  )
}
