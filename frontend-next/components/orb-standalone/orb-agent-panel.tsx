'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bot, Loader2, Search, X } from 'lucide-react'

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
  onApplyToChat
}: {
  open: boolean
  onClose: () => void
  initialAgentType?: string
  initialPrompt?: string
  onApplyToChat?: (text: string, response: OrbAgentRunResponse) => void
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
  }, [open, initialAgentType, initialPrompt])

  async function handleRun(event: React.FormEvent) {
    event.preventDefault()
    const text = prompt.trim()
    if (!text) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      if (deepResearchMode || selectedType === 'deep_research') {
        const deep = await runStandaloneOrbDeepResearch({
          query: text,
          depth,
          preferred_output: outputFormat,
          require_citations: requireCitations
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
          require_citations: requireCitations
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

          <form onSubmit={handleRun} className="space-y-3">
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
            <div className="mt-4 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <h3 className="text-sm font-semibold text-white">{result.output.title}</h3>
              {result.safety_notice ? (
                <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-100/90">{result.safety_notice}</p>
              ) : null}
              <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                {result.output.body}
              </div>
              {result.findings?.length ? (
                <div>
                  <p className="text-[10px] font-medium text-slate-500">Findings</p>
                  <ul className="mt-1 space-y-1">
                    {result.findings.slice(0, 5).map((f, i) => (
                      <li key={i} className="text-xs text-slate-400">
                        <span className="font-medium text-slate-300">{f.title}:</span> {f.summary}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.warnings?.length ? (
                <p className="text-[10px] text-slate-500">{result.warnings.join(' ')}</p>
              ) : null}
              {result.model_routing ? (
                <p className="text-[10px] text-slate-600">
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
