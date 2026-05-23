'use client'

import Link from 'next/link'
import { Lock, Wrench, X } from 'lucide-react'

type ToolAction = {
  id: string
  label: string
  description: string
  standalone?: boolean
  onClick?: () => void
  href?: string
}

type OsTool = {
  id: string
  label: string
  description: string
  href: string
}

const OS_TOOLS: OsTool[] = [
  { id: 'care-hub', label: 'Care Hub', description: 'OS command centre', href: '/care-hub' },
  { id: 'record', label: 'Record', description: 'Child-centred recording', href: '/record' },
  { id: 'young-people', label: 'Child profiles', description: 'Young people in your home', href: '/young-people' },
  { id: 'staff', label: 'Staff profiles', description: 'Workforce area', href: '/staff' },
  {
    id: 'intelligence-spine',
    label: 'Intelligence Spine',
    description: 'Patterns, evidence and manager brief',
    href: '/care-hub'
  },
  { id: 'actions', label: 'Action Board', description: 'Oversight actions', href: '/actions' },
  { id: 'governance', label: 'Governance', description: 'Oversight and compliance', href: '/governance' },
  { id: 'ofsted', label: 'Ofsted readiness', description: 'Inspection preparation', href: '/inspection' }
]

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
  onAskOrb?: () => void
}) {
  if (!open) return null

  const standaloneTools: ToolAction[] = [
    { id: 'ask', label: 'Ask ORB', description: 'General chat and modes', onClick: onAskOrb },
    { id: 'documents', label: 'Upload / analyse document', description: 'Policy and document understanding', onClick: onOpenDocuments },
    { id: 'knowledge', label: 'Knowledge Library', description: 'Ingest and search sources', onClick: onOpenKnowledge },
    { id: 'research', label: 'Deep Research', description: 'Multi-step research agent', onClick: onOpenAgents },
    { id: 'agents', label: 'Agents', description: 'Run specialist agents', onClick: onOpenAgents },
    { id: 'outputs', label: 'Saved Outputs', description: 'Standalone artefacts', onClick: onOpenSavedOutputs },
    { id: 'image', label: 'Image upload', description: 'Attach images in chat composer', onClick: onAskOrb },
    {
      id: 'recording',
      label: 'Recording wording helper',
      description: 'Record This Properly mode',
      onClick: onAskOrb
    },
    { id: 'action-plan', label: 'Action plan generator', description: 'From documents or agents', onClick: onOpenAgents },
    { id: 'policy', label: 'Policy comparison', description: 'Document panel', onClick: onOpenDocuments },
    { id: 'manager-brief', label: 'Manager briefing', description: 'Agent templates', onClick: onOpenAgents },
    { id: 'staff-brief', label: 'Staff briefing', description: 'Agent templates', onClick: onOpenAgents },
    { id: 'memory', label: 'Memory & preferences', description: 'Local workspace controls', onClick: onOpenMemory },
    { id: 'map', label: 'IndiCare Intelligence Map', description: 'Capability parity view', onClick: onOpenIntelligenceMap },
    { id: 'a11y', label: 'Accessibility', description: 'Reading and sensory options', onClick: onOpenAccessibility },
    { id: 'permissions', label: 'Mic & camera readiness', description: 'Device permission status', onClick: onOpenPermissions }
  ]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-label="IndiCare Tools">
      <div className="orb-floating-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1117] p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/90">
              <Wrench className="h-4 w-4" />
              IndiCare Tools
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Standalone ORB capabilities</h2>
            <p className="mt-2 text-sm text-slate-400">
              Tools below use <code className="text-cyan-200/80">/orb/standalone/*</code> only. They do not call OS APIs.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label="Close tools">
            <X className="h-5 w-5" />
          </button>
        </div>

        <section>
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Standalone</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {standaloneTools.map((tool) => (
              <li key={tool.id}>
                <button
                  type="button"
                  onClick={() => {
                    tool.onClick?.()
                    onClose()
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/5"
                >
                  <span className="text-sm font-bold text-slate-100">{tool.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{tool.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Operational (IndiCare OS)</h3>
          <p className="mt-2 text-xs leading-5 text-amber-200/80">
            This requires IndiCare OS context and will open the operational area. Standalone ORB does not fetch live
            records.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {OS_TOOLS.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={tool.href}
                  onClick={onClose}
                  className="flex w-full items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-violet-300/25 hover:bg-violet-400/5"
                >
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-300/80" aria-hidden />
                  <span>
                    <span className="text-sm font-bold text-slate-200">{tool.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{tool.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
