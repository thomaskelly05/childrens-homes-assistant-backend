'use client'

import Link from 'next/link'
import { Lock, Wrench } from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

type ToolCard = {
  id: string
  label: string
  description: string
  onClick?: () => void
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
  { id: 'governance', label: 'AI Governance', description: 'Oversight and compliance', href: '/governance' }
]

function ToolCardGrid({ tools, onSelect }: { tools: ToolCard[]; onSelect: (tool: ToolCard) => void }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {tools.map((tool) => (
        <li key={tool.id}>
          <button
            type="button"
            onClick={() => onSelect(tool)}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]"
            data-orb-tool-card={tool.id}
          >
            <span className="text-sm font-medium text-slate-100">{tool.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{tool.description}</span>
          </button>
        </li>
      ))}
    </ul>
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
  const primaryTools: ToolCard[] = [
    { id: 'ask', label: 'Ask ORB', description: 'Return to chat', onClick: onAskOrb },
    { id: 'documents', label: 'Documents', description: 'Upload and analyse policies', onClick: onOpenDocuments },
    { id: 'deep-research', label: 'Deep Research', description: 'Multi-step research agent', onClick: onRunDeepResearch ?? onOpenAgents },
    { id: 'agents', label: 'Agents', description: 'Specialist standalone agents', onClick: onOpenAgents },
    { id: 'knowledge', label: 'Knowledge Library', description: 'Ingest and search sources', onClick: onOpenKnowledge },
    { id: 'outputs', label: 'Saved Outputs', description: 'Your saved artefacts', onClick: onOpenSavedOutputs }
  ]

  const careTools: ToolCard[] = [
    { id: 'recording', label: 'Record wording helper', description: 'Daily notes and incident wording', onClick: onAskOrb },
    { id: 'action-plan', label: 'Action plan generator', description: 'From documents or agents', onClick: onOpenAgents },
    { id: 'policy', label: 'Policy comparison', description: 'Compare uploaded policies', onClick: onOpenDocuments },
    { id: 'manager-brief', label: 'Manager briefing', description: 'Agent templates', onClick: onOpenAgents },
    { id: 'staff-brief', label: 'Staff briefing', description: 'Shift handover support', onClick: onOpenAgents }
  ]

  const systemTools: ToolCard[] = [
    { id: 'map', label: 'Intelligence map', description: 'Capability parity view', onClick: onOpenIntelligenceMap },
    { id: 'memory', label: 'Memory', description: 'Local workspace preferences', onClick: onOpenMemory },
    { id: 'a11y', label: 'Accessibility', description: 'Reading and sensory options', onClick: onOpenAccessibility },
    { id: 'permissions', label: 'Permissions', description: 'Mic, camera and upload readiness', onClick: onOpenPermissions }
  ]

  function pickTool(tool: ToolCard) {
    tool.onClick?.()
    onClose()
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Tools"
      subtitle="Standalone capabilities — /orb/standalone/* only"
      onClose={onClose}
      ariaLabel="ORB tools"
    >
      <div className="space-y-6 p-4" data-orb-tools-panel>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-200/80">
          <Wrench className="h-3.5 w-3.5" aria-hidden />
          IndiCare Tools
        </p>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Primary tools</h3>
          <div className="mt-2">
            <ToolCardGrid tools={primaryTools} onSelect={pickTool} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Care support tools</h3>
          <div className="mt-2">
            <ToolCardGrid tools={careTools} onSelect={pickTool} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">System tools</h3>
          <div className="mt-2">
            <ToolCardGrid tools={systemTools} onSelect={pickTool} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Operational links</h3>
          <p className="mt-1 text-xs leading-5 text-amber-200/75">Requires IndiCare OS context — navigation only, no OS API calls from standalone ORB.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {OS_TOOLS.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={tool.href}
                  onClick={onClose}
                  className="flex w-full items-start gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left transition hover:border-violet-300/25 hover:bg-violet-400/[0.04]"
                  data-orb-os-link={tool.id}
                >
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-300/80" aria-hidden />
                  <span>
                    <span className="text-sm font-medium text-slate-200">{tool.label}</span>
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
