'use client'

import { useEffect, useState } from 'react'
import { Bot, Loader2, X } from 'lucide-react'

import { fetchOrbStandaloneAgents, runOrbStandaloneAgent } from '@/lib/orb/standalone-client'

export function OrbAgentPanel({
  open,
  onClose,
  documentSourceId,
  documentText,
  documentTitle
}: {
  open: boolean
  onClose: () => void
  documentSourceId?: string | null
  documentText?: string | null
  documentTitle?: string | null
}) {
  const [agents, setAgents] = useState<Array<{ id: string; name: string; agent_type: string }>>([])
  const [selectedId, setSelectedId] = useState('document_analysis')
  const [message, setMessage] = useState('Explain this document in plain English.')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    void fetchOrbStandaloneAgents()
      .then((list) => {
        setAgents(list)
        if (list.some((a) => a.id === 'document_analysis')) setSelectedId('document_analysis')
      })
      .catch(() => setAgents([{ id: 'document_analysis', name: 'Document Analysis Agent', agent_type: 'document_analysis' }]))
  }, [open])

  async function runAgent() {
    setLoading(true)
    setError(null)
    try {
      const result = await runOrbStandaloneAgent({
        agent_id: selectedId,
        message,
        source_id: documentSourceId || undefined,
        document_text: documentText || undefined,
        document_title: documentTitle || undefined,
        analysis_mode: 'explain'
      })
      setAnswer(result.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-300" aria-hidden />
            <h2 className="text-sm font-semibold text-white">Agents</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <label className="block text-xs text-slate-400">
            Agent
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Instruction
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAgent()}
            className="w-full rounded-xl bg-violet-500/20 py-2 text-sm font-semibold text-violet-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Run agent'}
          </button>
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          {answer ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-black/30 p-3 text-xs text-slate-200">
              {answer}
            </pre>
          ) : null}
          <p className="text-[10px] text-slate-500">Standalone agents only — no live OS records.</p>
        </div>
      </div>
    </div>
  )
}
