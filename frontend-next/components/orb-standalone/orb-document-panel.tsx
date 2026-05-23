'use client'

import { useCallback, useState } from 'react'
import { Copy, FileText, Loader2, X } from 'lucide-react'

import {
  OrbIntelligenceOutput,
  understandingToIntelligenceOutput
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'
// Action plans: orb-action-plan (via orb-intelligence-output)
import {
  analyseOrbStandaloneDocument,
  ingestOrbKnowledgeText,
  ORB_DOCUMENT_ANALYSIS_MODES,
  uploadOrbStandaloneDocument,
  type OrbDocumentAnalysisMode,
  type OrbDocumentUnderstanding
} from '@/lib/orb/standalone-client'

export function OrbDocumentPanel({
  open,
  onClose,
  onInsertIntoChat,
  onDocumentContext,
  onRunDeepResearch,
  onRunDocumentAnalysisAgent,
  initialText,
  projects,
  activeProjectId,
  activeProjectName,
  onReuseInChat
}: {
  open: boolean
  onClose: () => void
  onInsertIntoChat?: (text: string) => void
  onDocumentContext?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onRunDeepResearch?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onRunDocumentAnalysisAgent?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  initialText?: string
  projects?: StandaloneProject[]
  activeProjectId?: string
  activeProjectName?: string
  onReuseInChat?: (prompt: string) => void
}) {
  const [title, setTitle] = useState('Uploaded document')
  const [sourceType, setSourceType] = useState('user_uploaded')
  const [text, setText] = useState(initialText || '')
  const [mode, setMode] = useState<OrbDocumentAnalysisMode>('explain')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [understanding, setUnderstanding] = useState<OrbDocumentUnderstanding | null>(null)
  const [copyNote, setCopyNote] = useState<string | null>(null)

  const runAnalyse = useCallback(async () => {
    const body = text.trim()
    if (!body) {
      setError('Paste or upload document text first.')
      return
    }
    setLoading(true)
    setError(null)
    setCopyNote(null)
    try {
      const result = await analyseOrbStandaloneDocument({
        mode,
        source_id: sourceId || undefined,
        title: title.trim() || 'Document',
        text: sourceId ? undefined : body
      })
      setUnderstanding(result.understanding)
      onDocumentContext?.({
        text: text.trim(),
        title: title.trim() || result.understanding.title,
        sourceId: sourceId || result.understanding.source_id || null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [mode, sourceId, text, title])

  async function handleFileUpload(file: File) {
    setLoading(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
      const content_base64 = btoa(binary)
      const uploaded = await uploadOrbStandaloneDocument({
        title: file.name.replace(/\.[^.]+$/, '') || title,
        content_base64,
        file_name: file.name,
        content_type: file.type || undefined,
        source_type: sourceType
      })
      setSourceId(uploaded.source_id)
      setTitle(uploaded.title)
      setCopyNote(`Indexed ${uploaded.chunk_count} passages in Knowledge Library.`)
      onDocumentContext?.({ text: text.trim(), title: uploaded.title, sourceId: uploaded.source_id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  async function addToKnowledgeLibrary() {
    const body = text.trim()
    if (!body) return
    setLoading(true)
    setError(null)
    try {
      const result = await ingestOrbKnowledgeText({
        title: title.trim() || 'Document',
        text: body,
        source_type: sourceType as 'user_uploaded'
      })
      setSourceId(result.source.id)
      setCopyNote('Added to Knowledge Library.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to library')
    } finally {
      setLoading(false)
    }
  }

  function formatForChat(): string {
    if (!understanding) return ''
    const parts = [
      `# ${understanding.title}`,
      understanding.plain_english_summary,
      understanding.key_themes?.length
        ? `\nThemes: ${understanding.key_themes.join(', ')}`
        : '',
      understanding.safety_notice ? `\n${understanding.safety_notice}` : ''
    ]
    const actions = understanding.action_plan?.actions || []
    if (actions.length) {
      parts.push('\n## Actions (draft)')
      for (const a of actions) {
        parts.push(`- [${a.priority}] ${a.action}`)
      }
    }
    return parts.filter(Boolean).join('\n')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-white/[0.08] bg-[#0d1117] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-300" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-white">Documents</h2>
              <p className="text-[11px] text-slate-500">Standalone upload — no OS records</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <label className="block text-xs text-slate-400">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Source type
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="user_uploaded">User uploaded</option>
              <option value="policy">Policy</option>
              <option value="recording_quality">Recording quality</option>
              <option value="regulatory_framework">Regulatory framework</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Document text
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste policy, inspection notes, or guidance…"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-full border border-white/12 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06]">
              Upload file
              <input
                type="file"
                accept=".txt,.md,.pdf,.docx"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFileUpload(file)
                }}
              />
            </label>
            <button
              type="button"
              disabled={loading || !text.trim()}
              onClick={() => void addToKnowledgeLibrary()}
              className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
            >
              Add to Knowledge Library
            </button>
          </div>
          <label className="block text-xs text-slate-400">
            Analysis mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as OrbDocumentAnalysisMode)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {ORB_DOCUMENT_ANALYSIS_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalyse()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/20 py-2.5 text-sm font-semibold text-cyan-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Analyse document
          </button>
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          {copyNote ? <p className="text-xs text-emerald-300/90">{copyNote}</p> : null}

          {understanding ? (
            <div className="space-y-4 border-t border-white/[0.06] pt-4">
              <OrbIntelligenceOutput
                output={understandingToIntelligenceOutput(understanding)}
                onCopy={() => setCopyNote('Copied markdown to clipboard.')}
              />
              {projects?.length ? (
                <OrbOutputSaveActions
                  output={understandingToIntelligenceOutput(understanding)}
                  suggestedType={
                    mode === 'action_plan'
                      ? 'action_plan'
                      : mode === 'manager_briefing'
                        ? 'manager_briefing'
                        : mode === 'staff_briefing'
                          ? 'staff_briefing'
                          : 'document_review'
                  }
                  suggestedTitle={understanding.title}
                  projects={projects}
                  activeProjectId={activeProjectId}
                  activeProjectName={activeProjectName}
                  createdFrom="document_analysis"
                  createdFromId={understanding.source_id || undefined}
                  onReuseInChat={onReuseInChat}
                  onNotice={setCopyNote}
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {onRunDeepResearch ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRunDeepResearch({
                        text: text.trim(),
                        title: title.trim() || understanding.title,
                        sourceId: sourceId || understanding.source_id || null
                      })
                    }
                    className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100"
                  >
                    Run Deep Research from this document
                  </button>
                ) : null}
                {onRunDocumentAnalysisAgent ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRunDocumentAnalysisAgent({
                        text: text.trim(),
                        title: title.trim() || understanding.title,
                        sourceId: sourceId || understanding.source_id || null
                      })
                    }
                    className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                  >
                    Run Document Analysis Agent
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={async () => {
                    const next = await analyseOrbStandaloneDocument({
                      mode: 'manager_briefing',
                      source_id: sourceId || understanding.source_id || undefined,
                      title: title.trim() || understanding.title,
                      text: sourceId ? undefined : text.trim()
                    })
                    setUnderstanding(next.understanding)
                  }}
                  disabled={loading}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                >
                  Create manager briefing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const plan = understanding.action_plan?.actions || []
                    const lines = plan.map((a) => `- [${a.priority}] ${a.action}`)
                    void navigator.clipboard.writeText(lines.join('\n'))
                    setCopyNote('Action plan copied.')
                  }}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
                >
                  Copy action plan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(formatForChat())
                    setCopyNote('Copied to clipboard.')
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy result
                </button>
                {onInsertIntoChat ? (
                  <button
                    type="button"
                    onClick={() => onInsertIntoChat(formatForChat())}
                    className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                  >
                    Insert summary into chat
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
