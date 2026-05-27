'use client'

import { useState, type ReactNode } from 'react'
import { Copy, FileText, RotateCcw, Square, Volume2 } from 'lucide-react'

import { OrbHueMark } from '@/components/orb-standalone/orb-hue-logo'
import { OrbExplainabilityPanel, type OrbExplainabilityView } from '@/components/orb-standalone/orb-explainability-panel'
import { renderAnswerWithCitations } from '@/components/orb-standalone/orb-inline-citation'
import { cognitionLabelForMode } from '@/lib/orb/residential-agents'
import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'
import type { StandaloneOrbModelRouting } from '@/lib/orb/standalone-client'

function CognitionPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--orb-line)] bg-[var(--orb-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--orb-muted)]">
      Using · {label}
    </span>
  )
}

export function OrbCognitionIndicators({ mode, streaming }: { mode: string; streaming?: boolean }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <CognitionPill label={cognitionLabelForMode(mode)} />
      {streaming ? (
        <span className="text-[10px] text-[#00B8FF] orb-streaming-pulse" aria-live="polite">
          composing
        </span>
      ) : null}
    </div>
  )
}

export function OrbAssistantMessageBody({
  content,
  sources,
  mode,
  streaming,
  explainability,
  modelRouting
}: {
  content: string
  sources?: StandaloneOrbSource[]
  mode: string
  streaming?: boolean
  explainability?: OrbExplainabilityView
  modelRouting?: StandaloneOrbModelRouting
}) {
  return (
    <article
      className={`orb-message-assistant group flex gap-3 ${streaming ? 'orb-message-streaming' : ''}`}
      data-testid="orb-message-assistant"
    >
      <OrbHueMark pulse={streaming} />
      <div className="min-w-0 flex-1">
      <OrbCognitionIndicators mode={mode} streaming={streaming} />
      <div className="orb-message-content text-[15px] leading-7 text-[var(--orb-foreground)]">
        {renderAnswerWithCitations(content, sources)}
      </div>
      <OrbExplainabilityPanel explainability={explainability} cognitionModeLabel={cognitionLabelForMode(mode)} />
      <OrbSourcesDetail sources={sources} modelRouting={modelRouting} />
      </div>
    </article>
  )
}

function OrbSourcesDetail({
  sources,
  modelRouting
}: {
  sources?: StandaloneOrbSource[]
  modelRouting?: StandaloneOrbModelRouting
}) {
  const [open, setOpen] = useState(false)
  if (!sources?.length && !modelRouting) return null
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] font-medium text-slate-600 underline-offset-2 hover:text-slate-500 hover:underline"
      >
        {open ? 'Hide guidance detail' : 'View guidance detail'}
      </button>
      {open ? (
        <ul className="mt-2 space-y-1.5">
          {sources?.map((source, index) => (
            <li
              key={`${source.label}-${index}`}
              className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500"
            >
              <span className="font-medium text-slate-300">{source.label}</span>
              {source.basis ? <p className="mt-0.5">{source.basis}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function OrbResponseActionBar({
  content,
  speaking,
  synthesisAvailable,
  onSpeak,
  onStop,
  onNewQuestion,
  onDraft,
  onSave,
  onSaveToProject,
  onActionPlan,
  onReflection,
  onSupervision,
  onExport,
  onInspectionPrep
}: {
  content: string
  speaking: boolean
  synthesisAvailable: boolean
  onSpeak: () => void
  onStop: () => void
  onNewQuestion: () => void
  onDraft: () => void
  onSave?: () => void
  onSaveToProject?: () => void
  onActionPlan?: () => void
  onReflection?: () => void
  onSupervision?: () => void
  onExport?: () => void
  onInspectionPrep?: () => void
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1 border-t border-white/[0.04] pt-3">
      <ActionChip icon={<Copy className="h-3 w-3" />} label="Copy" onClick={() => void navigator.clipboard?.writeText(content)} />
      {onSaveToProject ? <ActionChip icon={<FileText className="h-3 w-3" />} label="Save to project" onClick={onSaveToProject} /> : null}
      {onActionPlan ? <ActionChip label="Action plan" onClick={onActionPlan} /> : null}
      {onReflection ? <ActionChip label="Save reflection" onClick={onReflection} /> : null}
      {onSupervision ? <ActionChip label="Supervision prompts" onClick={onSupervision} /> : null}
      {onExport ? <ActionChip label="Export" onClick={onExport} /> : null}
      {onInspectionPrep ? <ActionChip label="Inspection prep" onClick={onInspectionPrep} /> : null}
      {onSave ? <ActionChip icon={<FileText className="h-3 w-3" />} label="Save output" onClick={onSave} /> : null}
      {synthesisAvailable ? (
        speaking ? (
          <ActionChip icon={<Square className="h-3 w-3" />} label="Stop" onClick={onStop} />
        ) : (
          <ActionChip icon={<Volume2 className="h-3 w-3" />} label="Speak" onClick={onSpeak} />
        )
      ) : null}
      <ActionChip icon={<RotateCcw className="h-3 w-3" />} label="New question" onClick={onNewQuestion} />
      <ActionChip icon={<FileText className="h-3 w-3" />} label="Use as draft" onClick={onDraft} />
    </div>
  )
}

function ActionChip({ icon, label, onClick }: { icon?: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
    >
      {icon}
      {label}
    </button>
  )
}
