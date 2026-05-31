'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Bot,
  ClipboardList,
  FileText,
  Lock,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Wrench
} from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

type ToolItem = {
  id: string
  label: string
  description: string
  icon: ReactNode
  onClick?: () => void
  comingSoon?: boolean
}

function ToolRow({ tool, onSelect }: { tool: ToolItem; onSelect: (tool: ToolItem) => void }) {
  const disabled = tool.comingSoon || !tool.onClick
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onSelect(tool)}
      className="orb-panel-row flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55"
      data-orb-tool-card={tool.id}
      data-orb-tool-coming-soon={tool.comingSoon ? 'true' : undefined}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--orb-surface-hover)] text-[#00B8FF]">
        {tool.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-[var(--orb-foreground)]">{tool.label}</span>
          {tool.comingSoon ? (
            <span className="rounded-full bg-[var(--orb-surface-hover)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--orb-muted)]">
              Coming soon
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--orb-muted)]">{tool.description}</span>
      </span>
    </button>
  )
}

function ToolSection({ title, tools, onSelect }: { title: string; tools: ToolItem[]; onSelect: (tool: ToolItem) => void }) {
  if (!tools.length) return null
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--orb-muted)]">{title}</h3>
      <ul className="mt-2 grid gap-2">
        {tools.map((tool) => (
          <li key={tool.id}>
            <ToolRow tool={tool} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  )
}

const OS_LINKS = [
  { id: 'os-orb', label: 'OS ORB', description: 'Operational assistant with live context', href: '/assistant/orb' },
  { id: 'care-hub', label: 'Care Hub', description: 'OS command centre', href: '/care-hub' }
]

export function OrbToolsPanel({
  open,
  onClose,
  onOpenKnowledge,
  onOpenDocuments,
  onOpenAgents,
  onRunDeepResearch,
  onAskOrb,
  onComposerPrefill,
  onRunStandaloneAction
}: {
  open: boolean
  onClose: () => void
  onOpenKnowledge?: () => void
  onOpenDocuments?: () => void
  onOpenAgents?: () => void
  onRunDeepResearch?: () => void
  onAskOrb?: () => void
  onComposerPrefill?: (text: string) => void
  /** Backend-supported Academy/NVQ actions via /orb/standalone/actions/run */
  onRunStandaloneAction?: (actionId: string, prefill: string) => void
}) {
  const [query, setQuery] = useState('')

  const orbAppsTools: ToolItem[] = useMemo(
    () => [
      {
        id: 'review-this',
        label: 'Review This',
        description: 'Review pasted incident, plan or record for practice quality',
        icon: <ClipboardList className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onComposerPrefill?.(
            'Review this document for child voice, safeguarding, recording quality, evidence of impact and Ofsted readiness. I will paste the text below:\n\n'
          ) ?? onOpenDocuments?.()
      },
      {
        id: 'template-library',
        label: 'Template Library',
        description: 'Safeguarding, recording, care plans, Ofsted and locality templates',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onComposerPrefill?.(
            'Open the ORB template library — list templates for safeguarding and recording, or create a missing from care return conversation template.'
          )
      },
      {
        id: 'locality-risk',
        label: 'Locality Risk',
        description: 'Locality risk assessment template and guidance',
        icon: <Shield className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onComposerPrefill?.(
            'Help me write a locality risk assessment for my home. I will supply postcode, town and local authority.'
          )
      },
      {
        id: 'learn-micro',
        label: 'Learn',
        description: 'Turn guidance into a 5-minute staff learning session',
        icon: <BookOpen className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onComposerPrefill?.('Turn your previous answer into a 5-minute staff learning session with discussion questions.')
      }
    ],
    [onComposerPrefill, onOpenDocuments]
  )

  const documentTools: ToolItem[] = useMemo(
    () => [
      {
        id: 'upload-document',
        label: 'Upload / paste document',
        description: 'Attach text for document intelligence',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        onClick: onOpenDocuments
      },
      {
        id: 'policy-card',
        label: 'Policy card',
        description: 'Staff-ready policy summary from a document',
        icon: <ClipboardList className="h-4 w-4" aria-hidden />,
        onClick: onOpenDocuments
      },
      {
        id: 'reg44',
        label: 'Reg 44 review',
        description: 'Extract themes from a Reg 44 report',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        onClick: onOpenDocuments
      },
      {
        id: 'action-plan-doc',
        label: 'Action plan',
        description: 'Draft actions from uploaded evidence',
        icon: <ClipboardList className="h-4 w-4" aria-hidden />,
        onClick: onOpenDocuments
      }
    ],
    [onOpenDocuments]
  )

  const practiceTools: ToolItem[] = useMemo(
    () => [
      {
        id: 'what-missing',
        label: 'What am I missing?',
        description: 'Gap check on your last answer',
        icon: <Sparkles className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('What am I missing from this situation?')
      },
      {
        id: 'recording',
        label: 'Recording wording',
        description: 'Help with daily notes and incidents',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Help me with recording wording for this situation.')
      },
      {
        id: 'child-voice',
        label: 'Child voice prompt',
        description: 'Prompts to centre the child’s perspective',
        icon: <MessageSquare className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Add a child voice prompt for this situation.')
      },
      {
        id: 'therapeutic',
        label: 'Therapeutic reframe',
        description: 'Reflective therapeutic framing',
        icon: <Sparkles className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Offer a therapeutic reframe for this situation.')
      }
    ],
    [onComposerPrefill]
  )

  const shiftTools: ToolItem[] = useMemo(
    () => [
      {
        id: 'shift-plan',
        label: 'Build shift plan',
        description: 'Handover structure from shift notes',
        icon: <ClipboardList className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Build a shift plan from these notes.')
      },
      {
        id: 'handover',
        label: 'Handover summary',
        description: 'Concise handover draft',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Create a handover summary for the next shift.')
      },
      {
        id: 'priorities',
        label: 'Priorities',
        description: 'Top priorities for this shift',
        icon: <Sparkles className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('What are the top priorities for this shift?')
      }
    ],
    [onComposerPrefill]
  )

  const academyTools: ToolItem[] = useMemo(
    () => [
      {
        id: 'nvq-helper',
        label: 'NVQ / Diploma helper',
        description: 'Explain criteria and plan reflective accounts',
        icon: <BookOpen className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'explain_nvq_criteria',
            'I need help with my residential childcare diploma — explain the criteria I paste next in plain English.'
          ) ??
          onComposerPrefill?.(
            'I need help with my residential childcare diploma — explain criteria in plain English.'
          )
      },
      {
        id: 'explain-criteria',
        label: 'Explain criteria',
        description: 'Plain-English criteria from text you provide',
        icon: <BookOpen className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'explain_nvq_criteria',
            'Explain these qualification criteria in plain English:'
          ) ?? onComposerPrefill?.('Explain these qualification criteria in plain English:')
      },
      {
        id: 'map-evidence',
        label: 'Map evidence',
        description: 'Map described practice to criteria — no invented events',
        icon: <ClipboardList className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'map_to_nvq_evidence',
            'Map the practice I describe below to possible NVQ/diploma criteria. Do not invent events:'
          ) ??
          onComposerPrefill?.('Map my described practice to possible NVQ evidence (I will paste details):')
      },
      {
        id: 'reflective-plan',
        label: 'Reflective account plan',
        description: 'Structure reflection from real practice you describe',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'create_reflective_account_plan',
            'Create a reflective account plan from the practice I describe — do not invent incidents:'
          ) ??
          onComposerPrefill?.('Create a reflective account plan from the practice I describe:')
      },
      {
        id: 'pd-prompts',
        label: 'Professional discussion prompts',
        description: 'PD questions for assessors from supplied evidence',
        icon: <MessageSquare className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'create_professional_discussion_prompts',
            'Create professional discussion prompts from the evidence I describe:'
          ) ??
          onComposerPrefill?.('Create professional discussion prompts from this evidence:')
      },
      {
        id: 'witness-prompt',
        label: 'Witness testimony prompt',
        description: 'Witness focus areas from described practice',
        icon: <MessageSquare className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'create_witness_testimony_prompt',
            'Suggest witness testimony prompts from the practice I describe:'
          ) ?? onComposerPrefill?.('Suggest witness testimony prompts for:')
      },
      {
        id: 'evidence-gaps',
        label: 'Evidence gaps',
        description: 'Gaps in learning evidence from what you share',
        icon: <Sparkles className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'identify_learning_evidence_gaps',
            'What learning evidence gaps do you see from what I describe?'
          ) ?? onComposerPrefill?.('What learning evidence gaps do you see from what I describe?')
      },
      {
        id: 'learner-plan',
        label: 'Learner action plan',
        description: 'Plan to collect authentic missing evidence',
        icon: <ClipboardList className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'create_learner_action_plan',
            'Create a learner action plan for missing evidence from what I describe:'
          ) ?? onComposerPrefill?.('Create a learner action plan for missing evidence:')
      },
      {
        id: 'incident-learning',
        label: 'Staff learning from incident',
        description: 'Reflective learning from an incident you describe',
        icon: <Shield className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'incident_to_reflective_learning',
            'Turn this incident into reflective learning from what I describe only:'
          ) ??
          onComposerPrefill?.('Turn this incident into reflective learning (I will describe what happened):')
      },
      {
        id: 'supervision-evidence',
        label: 'Supervision to evidence',
        description: 'Link supervision themes to qualification evidence',
        icon: <FileText className="h-4 w-4" aria-hidden />,
        onClick: () =>
          onRunStandaloneAction?.(
            'supervision_to_learning_evidence',
            'Link this supervision material to possible learning evidence:'
          ) ?? onComposerPrefill?.('Link this supervision to possible learning evidence:')
      }
    ],
    [onComposerPrefill, onRunStandaloneAction]
  )

  const oversightTools: ToolItem[] = useMemo(
    () => [
      {
        id: 'manager-oversight',
        label: 'Manager oversight',
        description: 'Manager-ready oversight note',
        icon: <Shield className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Create a manager oversight note for this situation.')
      },
      {
        id: 'ri-governance',
        label: 'RI governance',
        description: 'Responsible individual governance lens',
        icon: <Shield className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Add a responsible individual governance lens.')
      },
      {
        id: 'ofsted-lens',
        label: 'Ofsted lens',
        description: 'SCCIF-aligned reflection support',
        icon: <Search className="h-4 w-4" aria-hidden />,
        onClick: () => onComposerPrefill?.('Add an Ofsted lens to this.')
      }
    ],
    [onComposerPrefill]
  )

  const researchTools: ToolItem[] = useMemo(
    () => [
      {
        id: 'deep-research',
        label: 'Deep research',
        description: 'Multi-step research with citations',
        icon: <Search className="h-4 w-4" aria-hidden />,
        onClick: onRunDeepResearch ?? onOpenAgents
      },
      {
        id: 'knowledge',
        label: 'Knowledge Library',
        description: 'Built-in reference sources',
        icon: <BookOpen className="h-4 w-4" aria-hidden />,
        onClick: onOpenKnowledge
      },
      {
        id: 'agents',
        label: 'Agents',
        description: 'Specialist ORB agents',
        icon: <Bot className="h-4 w-4" aria-hidden />,
        onClick: onOpenAgents
      }
    ],
    [onOpenAgents, onOpenKnowledge, onRunDeepResearch]
  )

  const normalizedQuery = query.trim().toLowerCase()

  function filterTools(tools: ToolItem[]): ToolItem[] {
    if (!normalizedQuery) return tools
    return tools.filter(
      (tool) =>
        tool.label.toLowerCase().includes(normalizedQuery) ||
        tool.description.toLowerCase().includes(normalizedQuery)
    )
  }

  function pickTool(tool: ToolItem) {
    tool.onClick?.()
    onClose()
  }

  const sections = [
    { title: 'ORB apps', tools: filterTools(orbAppsTools) },
    { title: 'Documents', tools: filterTools(documentTools) },
    { title: 'Learning / Academy', tools: filterTools(academyTools) },
    { title: 'Practice', tools: filterTools(practiceTools) },
    { title: 'Shift', tools: filterTools(shiftTools) },
    { title: 'Oversight', tools: filterTools(oversightTools) },
    { title: 'Research', tools: filterTools(researchTools) }
  ]

  const hasResults = sections.some((section) => section.tools.length > 0)

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Tools"
      subtitle="Standalone capabilities — no live OS records"
      onClose={onClose}
      ariaLabel="ORB tools"
      panelId="tools"
      footer="ORB Residential does not access IndiCare OS records."
    >
      <div className="space-y-5 p-4" data-orb-tools-panel>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0369A1]">
          <Wrench className="h-3.5 w-3.5" aria-hidden />
          ORB tools
        </p>

        <button
          type="button"
          onClick={() => {
            onAskOrb?.()
            onClose()
          }}
          className="orb-panel-row flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left"
          data-orb-tool-card="ask"
        >
          <MessageSquare className="h-4 w-4 text-[#00B8FF]" aria-hidden />
          <span className="text-sm font-medium text-[var(--orb-foreground)]">Return to chat</span>
        </button>

        <label className="flex items-center gap-2 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="w-full bg-transparent text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
            data-orb-tools-search
          />
        </label>

        {sections.map((section) => (
          <ToolSection key={section.title} title={section.title} tools={section.tools} onSelect={pickTool} />
        ))}

        {!hasResults && normalizedQuery ? (
          <p className="text-sm text-[var(--orb-muted)]">No tools match your search.</p>
        ) : null}

        <section>
          <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--orb-muted)]">Operational OS links</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--orb-muted)]">Navigation only — requires IndiCare OS sign-in.</p>
          <ul className="mt-2 grid gap-2">
            {OS_LINKS.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={tool.href}
                  onClick={onClose}
                  className="flex w-full items-start gap-2 rounded-xl border border-[var(--orb-line)] px-3 py-3 text-left hover:bg-[var(--orb-surface-hover)]"
                  data-orb-os-link={tool.id}
                >
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                  <span>
                    <span className="text-sm font-medium text-[var(--orb-foreground)]">{tool.label}</span>
                    <span className="mt-0.5 block text-xs text-[var(--orb-muted)]">{tool.description}</span>
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
