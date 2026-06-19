'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bot, Loader2, Search } from 'lucide-react'

import {
  OrbIntelligenceOutput,
  agentResponseToIntelligenceOutput
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'
import {
  fetchStandaloneOrbAgents,
  runStandaloneOrbAgent,
  runStandaloneOrbDeepResearch,
  type OrbAgentDefinition,
  type OrbAgentOutputFormat,
  type OrbAgentRunResponse,
  type OrbAgentDepth
} from '@/lib/orb/standalone-client'

const DEPTH_OPTIONS: OrbAgentDepth[] = ['quick', 'standard', 'deep']
const OUTPUT_OPTIONS: OrbAgentOutputFormat[] = [
  'answer',
  'briefing',
  'checklist',
  'comparison',
  'action_plan',
  'supervision_guide',
  'evidence_map'
]

const FEATURED_AGENTS: Array<{
  type: string
  title: string
  useCase: string
  risk: string
}> = [
  { type: 'deep_research', title: 'Deep Research', useCase: 'Multi-step research with citations', risk: 'Privacy safe' },
  {
    type: 'document_analysis',
    title: 'Document Analysis',
    useCase: 'Structured review of uploaded documents',
    risk: 'Adult review required'
  },
  { type: 'ofsted_research', title: 'Ofsted Research', useCase: 'Inspection and evidence thinking', risk: 'Adult review required' },
  {
    type: 'recording_quality',
    title: 'Recording Quality',
    useCase: 'Wording and record-quality support',
    risk: 'Privacy safe'
  },
  {
    type: 'safeguarding_reflection',
    title: 'Safeguarding Reflection',
    useCase: 'Reflect on concerns without deciding outcomes',
    risk: 'Escalate live risk'
  },
  { type: 'policy_comparison', title: 'Policy Comparison', useCase: 'Compare policies and gaps', risk: 'Adult review required' },
  { type: 'manager_briefing', title: 'Manager Briefing', useCase: 'Manager-ready draft briefings', risk: 'Adult review required' },
  {
    type: 'therapeutic_practice',
    title: 'Therapeutic Practice',
    useCase: 'Trauma-informed practice reflection',
    risk: 'Privacy safe'
  }
]

export function OrbAgentPanel({
  open,
  onClose,
  initialAgentType,
  initialPrompt,
  initialDocumentText,
  initialDocumentSourceId,
  initialDocumentTitle,
  onApplyToChat,
  projects,
  activeProjectId,
  activeProjectName,
  onReuseInChat,
  onOpenSavedOutputs
}: {
  open: boolean
  onClose: () => void
  initialAgentType?: string
  initialPrompt?: string
  initialDocumentText?: string
  initialDocumentSourceId?: string | null
  initialDocumentTitle?: string
  onApplyToChat?: (text: string, response: OrbAgentRunResponse) => void
  projects?: StandaloneProject[]
  activeProjectId?: string
  activeProjectName?: string
  onReuseInChat?: (prompt: string) => void
  onOpenSavedOutputs?: () => void
}) {
  const [agents, setAgents] = useState<OrbAgentDefinition[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string>(initialAgentType || 'deep_research')
  const [prompt, setPrompt] = useState(initialPrompt || '')
  const [depth, setDepth] = useState<OrbAgentDepth>('standard')
  const [outputFormat, setOutputFormat] = useState<OrbAgentOutputFormat>('briefing')
  const [requireCitations, setRequireCitations] = useState(true)
  const [deepResearchMode, setDeepResearchMode] = useState(initialAgentType === 'deep_research')
  const [result, setResult] = useState<OrbAgentRunResponse | null>(null)
  const [documentText, setDocumentText] = useState(initialDocumentText || '')
  const [documentSourceId, setDocumentSourceId] = useState(initialDocumentSourceId || '')
  const [documentTitle, setDocumentTitle] = useState(initialDocumentTitle || '')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchStandaloneOrbAgents()
      setAgents(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    if (initialAgentType) setSelectedType(initialAgentType)
    if (initialPrompt) setPrompt(initialPrompt)
    if (initialAgentType === 'deep_research') setDeepResearchMode(true)
    if (initialDocumentText) setDocumentText(initialDocumentText)
    if (initialDocumentSourceId) setDocumentSourceId(initialDocumentSourceId)
    if (initialDocumentTitle) setDocumentTitle(initialDocumentTitle)
  }, [
    open,
    initialAgentType,
    initialPrompt,
    initialDocumentText,
    initialDocumentSourceId,
    initialDocumentTitle
  ])

  async function handleRun(event: React.FormEvent) {
    event.preventDefault()
    const text = prompt.trim()
    if (!text) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const docPayload = {
        document_text: documentText.trim() || undefined,
        document_source_id: documentSourceId.trim() || undefined,
        document_title: documentTitle.trim() || undefined
      }
      if (deepResearchMode || selectedType === 'deep_research') {
        const deep = await runStandaloneOrbDeepResearch({
          query: text,
          depth,
          preferred_output: outputFormat,
          require_citations: requireCitations,
          ...docPayload
        })
        const mapped: OrbAgentRunResponse = {
          success: deep.success,
          agent_type: 'deep_research',
          status: 'completed',
          output: deep.output,
          findings: deep.findings,
          sources: deep.sources,
          citations: deep.citations,
          steps: deep.steps,
          context_used: deep.context_used,
          model_routing: deep.model_routing,
          warnings: [...(deep.warnings || []), ...(deep.live_web_note ? [deep.live_web_note] : [])],
          safety_notice: deep.safety_notice
        }
        setResult(mapped)
        onApplyToChat?.(mapped.output.body, mapped)
      } else {
        const response = await runStandaloneOrbAgent({
          agent_type: selectedType,
          prompt: text,
          depth,
          preferred_output: outputFormat,
          require_citations: requireCitations,
          ...docPayload
        })
        setResult(response)
        onApplyToChat?.(response.output.body, response)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed')
    } finally {
      setRunning(false)
    }
  }

  const selectedAgent = agents.find((a) => a.type === selectedType)
  const featured = FEATURED_AGENTS.find((a) => a.type === selectedType) || FEATURED_AGENTS[0]

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Agents"
      subtitle="Run specialist ORB agents for research, recording, safeguarding and Ofsted thinking."
      onClose={onClose}
      panelId="agents"
      ariaLabel="ORB agents"
      footer="Agents create draft support outputs for adult review."
    >
      <div className="space-y-4 p-4" data-orb-agent-panel data-orb-specialist-agents>
        <p className="text-[11px] leading-5 text-slate-500">
          Specialist ORB agents use standalone Knowledge Library context only.
        </p>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading agents…
          </p>
        ) : null}

        <ul className="grid gap-2 sm:grid-cols-2">
          {FEATURED_AGENTS.map((agent) => (
            <li key={agent.type}>
              <article
                className={`orb-panel-card rounded-xl border px-3 py-3 transition ${
                  selectedType === agent.type
                    ? 'border-cyan-300/30 bg-cyan-500/[0.06]'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/12'
                }`}
                data-orb-agent-card={agent.type}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-slate-100">{agent.title}</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{agent.useCase}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-400 ring-1 ring-white/[0.08]">
                    {agent.risk}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeepResearchMode(agent.type === 'deep_research')
                    setSelectedType(agent.type)
                    if (!prompt.trim()) {
                      setPrompt(
                        agent.type === 'deep_research'
                          ? 'Run deep research on this topic'
                          : `Run ${agent.title.toLowerCase()} on this topic`
                      )
                    }
                  }}
                  className="mt-2 w-full rounded-lg bg-white/[0.06] py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/[0.08] hover:bg-white/[0.08]"
                >
                  Run
                </button>
              </article>
            </li>
          ))}
        </ul>

        {selectedAgent ? (
          <p className="text-xs leading-5 text-slate-400">{selectedAgent.description}</p>
        ) : (
          <p className="text-xs leading-5 text-slate-400">{featured.useCase}</p>
        )}

          {selectedType === 'document_analysis' ? (
            <p className="mb-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-[11px] text-cyan-100/90">
              Uses the dedicated Document Understanding Service (not generic RAG-only analysis).
            </p>
          ) : null}

          <form onSubmit={handleRun} className="space-y-3">
            {selectedType === 'document_analysis' || deepResearchMode ? (
              <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Standalone document context
                </p>
                <label className="block text-xs text-slate-400">
                  Paste document text
                  <textarea
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    rows={3}
                    placeholder="Or use latest uploaded document from Documents panel…"
                    className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Knowledge Library source ID (optional)
                  <input
                    value={documentSourceId}
                    onChange={(e) => setDocumentSourceId(e.target.value)}
                    placeholder="From Documents upload"
                    className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </label>
                {initialDocumentText && !documentText ? (
                  <button
                    type="button"
                    onClick={() => setDocumentText(initialDocumentText)}
                    className="text-xs text-cyan-300 hover:underline"
                  >
                    Use latest uploaded document
                  </button>
                ) : null}
              </div>
            ) : null}
            <label className="block text-xs font-medium text-slate-400">
              Prompt
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                placeholder="e.g. Research what Ofsted expects around child voice and create a manager briefing."
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">
                Depth
                <select
                  value={depth}
                  onChange={(e) => setDepth(e.target.value as OrbAgentDepth)}
                  className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1.5 text-sm text-white"
                >
                  {DEPTH_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Output
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as OrbAgentOutputFormat)}
                  className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1.5 text-sm text-white"
                >
                  {OUTPUT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={requireCitations}
                onChange={(e) => setRequireCitations(e.target.checked)}
                className="rounded border-white/20"
              />
              Require citations
            </label>

            <button
              type="submit"
              disabled={running || !prompt.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {deepResearchMode ? 'Run Deep Research' : 'Run agent'}
            </button>
          </form>

          {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}

        {result ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <OrbIntelligenceOutput output={agentResponseToIntelligenceOutput(result)} />
            {projects?.length ? (
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <OrbOutputSaveActions
                  output={agentResponseToIntelligenceOutput(result)}
                  suggestedType={
                    deepResearchMode
                      ? 'deep_research'
                      : outputFormat === 'action_plan'
                        ? 'action_plan'
                        : outputFormat === 'briefing'
                          ? 'manager_briefing'
                          : 'general_research'
                  }
                  suggestedTitle={result.output.title}
                  projects={projects}
                  activeProjectId={activeProjectId}
                  activeProjectName={activeProjectName}
                  createdFrom={deepResearchMode ? 'deep_research' : 'agent'}
                  onReuseInChat={onReuseInChat}
                />
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(result.output.body)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
              >
                Copy
              </button>
              {onOpenSavedOutputs ? (
                <button
                  type="button"
                  onClick={onOpenSavedOutputs}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                >
                  Open Records & Drafts
                </button>
              ) : null}
            </div>
            {result.model_routing ? (
              <p className="mt-3 text-[10px] text-slate-600">
                Model: {result.model_routing.provider}/{result.model_routing.model} ({result.model_routing.task_type})
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </OrbStandalonePanelShell>
  )
}
