'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bot, Loader2, Search, X } from 'lucide-react'

import {
  OrbIntelligenceOutput,
  agentResponseToIntelligenceOutput
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
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
  onReuseInChat
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

  if (!open) return null

  const selectedAgent = agents.find((a) => a.type === selectedType)

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#0d1117] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-400" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-white">Agents</h2>
              <p className="text-[10px] text-slate-500">Standalone — Knowledge Library only</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06]" aria-label="Close agents">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading agents…
            </p>
          ) : null}

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDeepResearchMode(true)
                setSelectedType('deep_research')
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                deepResearchMode ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30' : 'bg-white/[0.04] text-slate-400'
              }`}
            >
              Deep Research
            </button>
            {agents.map((agent) => (
              <button
                key={agent.type}
                type="button"
                onClick={() => {
                  setDeepResearchMode(false)
                  setSelectedType(agent.type)
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  !deepResearchMode && selectedType === agent.type
                    ? 'bg-white/[0.08] text-white ring-1 ring-white/10'
                    : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                }`}
              >
                {agent.name.replace(' Agent', '')}
              </button>
            ))}
          </div>

          {selectedAgent ? (
            <p className="mb-3 text-xs leading-5 text-slate-400">{selectedAgent.description}</p>
          ) : null}

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
            <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
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
              {result.model_routing ? (
                <p className="mt-3 text-[10px] text-slate-600">
                  Model: {result.model_routing.provider}/{result.model_routing.model} ({result.model_routing.task_type})
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
