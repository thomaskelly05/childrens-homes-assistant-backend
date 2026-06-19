'use client'

import { useState } from 'react'
import { Copy, Download, FolderPlus, MessageSquarePlus, Save } from 'lucide-react'

import { OrbPrivacyNotice } from '@/components/orb/privacy/orb-privacy-notice'
import {
  buildCopyMarkdown,
  type OrbIntelligenceOutputView
} from '@/components/orb-standalone/orb-intelligence-output'
import {
  buildSavedOutputCreateBody,
  ORB_SAVED_OUTPUT_BOUNDARY_LINES,
  type OrbSavedOutputSaveExtras
} from '@/lib/orb/orb-saved-output-adapters'
import {
  createOrbSavedOutput,
  exportOrbSavedOutput,
  reuseOrbSavedOutput,
  STANDALONE_ARTEFACT_NOTICE,
  type OrbSavedOutputType
} from '@/lib/orb/standalone-client'
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'

export function OrbOutputSaveActions({
  output,
  suggestedType,
  suggestedTitle,
  suggestedTags,
  projects,
  activeProjectId,
  activeProjectName,
  createdFrom = 'manual',
  createdFromId,
  saveExtras,
  onSaved,
  onReuseInChat,
  onNotice
}: {
  output: OrbIntelligenceOutputView
  suggestedType?: OrbSavedOutputType
  suggestedTitle?: string
  suggestedTags?: string[]
  projects: StandaloneProject[]
  activeProjectId?: string
  activeProjectName?: string
  createdFrom?: string
  createdFromId?: string
  saveExtras?: OrbSavedOutputSaveExtras
  onSaved?: (outputId: string) => void
  onReuseInChat?: (prompt: string) => void
  onNotice?: (message: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [title, setTitle] = useState(suggestedTitle || output.title)
  const [type, setType] = useState<OrbSavedOutputType>(suggestedType || 'general_research')
  const [projectId, setProjectId] = useState(activeProjectId || '')
  const [tagsText, setTagsText] = useState((suggestedTags || []).join(', '))

  const markdown = buildCopyMarkdown(output)

  function buildBody(resolvedType: OrbSavedOutputType) {
    const project = projects.find((p) => p.id === projectId)
    return buildSavedOutputCreateBody({
      title: title.trim() || output.title,
      type: resolvedType,
      project_id: projectId || undefined,
      project_name: project?.name || activeProjectName,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      summary: output.summary,
      content_markdown: markdown,
      intelligence_output: output as unknown as Record<string, unknown>,
      sources: output.sources,
      citations: output.citations,
      quality: output.quality as Record<string, unknown> | undefined,
      created_from: createdFrom,
      created_from_id: createdFromId,
      extras: {
        ...saveExtras,
        source_feature: saveExtras?.source_feature || (createdFrom as OrbSavedOutputSaveExtras['source_feature'])
      }
    })
  }

  async function handleSave(asType?: OrbSavedOutputType) {
    const resolvedType = asType || type
    setSaving(true)
    try {
      const record = await createOrbSavedOutput(buildBody(resolvedType))
      onSaved?.(record.id)
      onNotice?.('Saved to Saved Outputs — needs adult review before sharing.')
      setSaveOpen(false)
    } catch {
      void navigator.clipboard.writeText(markdown)
      onNotice?.('Could not save to server — markdown copied locally instead.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    try {
      const saved = await createOrbSavedOutput(buildBody(type))
      const exported = await exportOrbSavedOutput(saved.id, 'markdown')
      void navigator.clipboard.writeText(exported.content)
      onNotice?.('Exported markdown copied to clipboard.')
    } catch {
      void navigator.clipboard.writeText(markdown)
      onNotice?.('Markdown copied to clipboard.')
    }
  }

  async function handleReuse() {
    try {
      const saved = await createOrbSavedOutput(buildBody(type))
      const reuse = await reuseOrbSavedOutput(saved.id)
      onReuseInChat?.(reuse.suggested_prompt)
    } catch {
      onReuseInChat?.(
        `Use this saved ORB output as context:\n\n${output.summary}\n\nI want to: `
      )
    }
  }

  return (
    <div className="space-y-2" data-orb-output-save-actions>
      <ul className="space-y-0.5 text-[11px] leading-relaxed text-slate-500">
        {ORB_SAVED_OUTPUT_BOUNDARY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed text-slate-500">{STANDALONE_ARTEFACT_NOTICE}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSaveOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
          data-orb-save-output
        >
          <FolderPlus className="h-3.5 w-3.5" aria-hidden />
          Save to Saved Outputs
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave('manager_briefing')}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
        >
          Save as briefing
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave('action_plan')}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
        >
          Save as action plan
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(markdown)
            onNotice?.('Copied markdown to clipboard.')
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
          data-orb-copy-output
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy markdown
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
          data-orb-export-output
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export markdown
        </button>
        {onReuseInChat ? (
          <button
            type="button"
            onClick={() => void handleReuse()}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100"
            data-orb-ask-orb-output
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
            Ask ORB about this
          </button>
        ) : null}
      </div>

      {saveOpen ? (
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
          <label className="block text-xs text-slate-400">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as OrbSavedOutputType)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
            >
              <option value="document_review">Document review</option>
              <option value="action_plan">Action plan</option>
              <option value="manager_briefing">Manager briefing</option>
              <option value="staff_briefing">Staff briefing</option>
              <option value="deep_research">Deep research</option>
              <option value="general_research">General research</option>
              <option value="intelligence_note">Note</option>
              <option value="recording_rewrite">Recording rewrite</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Project
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Tags (comma-separated)
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm text-white"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500/20 py-2 text-xs font-semibold text-cyan-50 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? 'Saving…' : 'Save output'}
          </button>
        </div>
      ) : null}

      <OrbPrivacyNotice surface="export" className="text-left" />
    </div>
  )
}
