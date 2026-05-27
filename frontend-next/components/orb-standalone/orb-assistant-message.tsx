'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Copy, FileText, MoreHorizontal, RotateCcw, Square, Volume2 } from 'lucide-react'

import { OrbHueMark } from '@/components/orb-standalone/orb-hue-logo'
import { OrbExplainabilityPanel, type OrbExplainabilityView } from '@/components/orb-standalone/orb-explainability-panel'
import { OrbMarkdownAnswer } from '@/components/orb-standalone/orb-markdown-answer'
import { cognitionPillLabel } from '@/lib/orb/residential-agents'
import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'
import type { StandaloneOrbModelRouting } from '@/lib/orb/standalone-client'

function CognitionPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-[var(--orb-line)] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#475569]"
      data-orb-cognition-pill
    >
      Using · {label}
    </span>
  )
}

export function OrbCognitionIndicators({
  mode,
  streaming,
  explainability
}: {
  mode: string
  streaming?: boolean
  explainability?: OrbExplainabilityView
}) {
  const label = cognitionPillLabel(mode, explainability)
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <CognitionPill label={label} />
      {streaming ? (
        <span className="orb-electric-text text-[10px] orb-streaming-pulse" aria-live="polite">
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
  const cognitionLabel = cognitionPillLabel(mode, explainability)
  return (
    <article
      className={`orb-message-assistant group flex gap-3.5 ${streaming ? 'orb-message-streaming' : ''}`}
      data-testid="orb-message-assistant"
    >
      <OrbHueMark pulse={streaming} />
      <div className="min-w-0 flex-1">
        <OrbCognitionIndicators mode={mode} streaming={streaming} explainability={explainability} />
        <div className="orb-message-content text-[15px] leading-7 text-[var(--orb-foreground)]">
          <OrbMarkdownAnswer content={content} sources={sources} />
        </div>
        <OrbExplainabilityPanel explainability={explainability} cognitionModeLabel={cognitionLabel} />
        <OrbSourcesDetail content={content} sources={sources} modelRouting={modelRouting} />
      </div>
    </article>
  )
}

function OrbSourcesDetail({
  content,
  sources,
  modelRouting
}: {
  content: string
  sources?: StandaloneOrbSource[]
  modelRouting?: StandaloneOrbModelRouting
}) {
  const [open, setOpen] = useState(false)
  const hasInlineCitations = /\[[^\]]+\]/.test(content)
  const topicSources =
    sources?.filter((source) => {
      const label = (source.label || '').trim().toLowerCase()
      if (!label) return false
      if (label.startsWith('[') && label.endsWith(']')) return true
      const generic = [
        'standalone orb product boundary',
        'indicare product context',
        'general model knowledge',
        'ofsted sccif framework knowledge',
        "children's homes regulations",
        'quality standards',
        'residential children',
        'safeguarding practice principles',
        'therapeutic practice',
        'built-in therapeutic',
        'built-in product'
      ]
      if (generic.some((term) => label.includes(term))) return false
      if (hasInlineCitations && (label.includes('therapeutic') || label.includes('emotionally containing'))) {
        return false
      }
      return true
    }) ?? []
  if (!topicSources.length && !modelRouting) return null
  return (
    <div className="mt-2" data-orb-sources-detail>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-medium text-[#64748B] underline-offset-2 hover:text-[#0F172A] hover:underline"
      >
        {open ? 'Hide guidance detail' : 'View guidance detail'}
      </button>
      {open ? (
        <ul className="mt-2 space-y-1.5">
          {topicSources.map((source, index) => (
            <li
              key={`${source.label}-${index}`}
              className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] text-[#475569]"
            >
              <span className="font-semibold text-[#0F172A]">{source.label}</span>
              {source.basis ? <p className="mt-0.5 leading-relaxed">{source.basis}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function OrbResponseActionBar({
  mode,
  content,
  speaking,
  synthesisAvailable,
  onSpeak,
  onStop,
  onNewQuestion,
  onRegenerate,
  onDraft,
  onSave,
  onSaveToProject,
  onActionPlan,
  onReflection,
  onSupervision,
  onExport,
  onInspectionPrep
}: {
  mode: string
  content: string
  speaking: boolean
  synthesisAvailable: boolean
  onSpeak: () => void
  onStop: () => void
  onNewQuestion: () => void
  onRegenerate?: () => void
  onDraft: () => void
  onSave?: () => void
  onSaveToProject?: () => void
  onActionPlan?: () => void
  onReflection?: () => void
  onSupervision?: () => void
  onExport?: () => void
  onInspectionPrep?: () => void
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const modeKey = mode.trim().toLowerCase()
  const isRecording = modeKey === 'record this properly'
  const isStaffCoach = modeKey === 'staff coach'
  const isInspection =
    modeKey === 'ofsted lens' || modeKey === 'reg 44 / reg 45 prep' || modeKey.includes('reg 44')

  const primaryActions: ReactNode[] = [
    <ActionChip key="copy" icon={<Copy className="h-3 w-3" />} label="Copy" onClick={() => void navigator.clipboard?.writeText(content)} />
  ]
  if (onRegenerate) {
    primaryActions.push(
      <ActionChip key="regen" icon={<RotateCcw className="h-3 w-3" />} label="Regenerate" onClick={onRegenerate} dataAttr="regenerate" />
    )
  }
  if (synthesisAvailable) {
    primaryActions.push(
      speaking ? (
        <ActionChip key="stop" icon={<Square className="h-3 w-3" />} label="Stop" onClick={onStop} />
      ) : (
        <ActionChip key="speak" icon={<Volume2 className="h-3 w-3" />} label="Speak" onClick={onSpeak} />
      )
    )
  }
  if (onSave) {
    primaryActions.push(<ActionChip key="save" icon={<FileText className="h-3 w-3" />} label="Save" onClick={onSave} />)
  }
  if (isRecording) {
    primaryActions.push(
      <ActionChip key="draft" icon={<FileText className="h-3 w-3" />} label="Use as draft" onClick={onDraft} dataAttr="use-as-draft" />
    )
  }
  if (isStaffCoach && onSupervision) {
    primaryActions.push(<ActionChip key="supervision" label="Supervision prompts" onClick={onSupervision} dataAttr="supervision-prompts" />)
  }
  if (isInspection && onInspectionPrep) {
    primaryActions.push(<ActionChip key="inspection" label="Inspection prep" onClick={onInspectionPrep} dataAttr="inspection-prep" />)
  }

  const moreActions: ReactNode[] = []
  if (!isRecording) {
    moreActions.push(<ActionChip key="draft-more" icon={<FileText className="h-3 w-3" />} label="Use as draft" onClick={onDraft} />)
  }
  if (onSaveToProject) moreActions.push(<ActionChip key="project" label="Save to project" onClick={onSaveToProject} />)
  if (onActionPlan) moreActions.push(<ActionChip key="plan" label="Action plan" onClick={onActionPlan} />)
  if (onReflection) moreActions.push(<ActionChip key="reflection" label="Save reflection" onClick={onReflection} />)
  if (!isStaffCoach && onSupervision) {
    moreActions.push(<ActionChip key="supervision-more" label="Supervision prompts" onClick={onSupervision} />)
  }
  if (onExport) moreActions.push(<ActionChip key="export" label="Export" onClick={onExport} />)
  if (!isInspection && onInspectionPrep) {
    moreActions.push(<ActionChip key="inspection-more" label="Inspection prep" onClick={onInspectionPrep} />)
  }
  moreActions.push(<ActionChip key="new-q" icon={<RotateCcw className="h-3 w-3" />} label="New question" onClick={onNewQuestion} />)

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-[var(--orb-line)] pt-3" data-orb-response-actions>
      {primaryActions}
      {moreActions.length ? (
        <div className="relative" data-orb-action-more-menu>
          <ActionChip
            icon={<MoreHorizontal className="h-3 w-3" />}
            label="More"
            onClick={() => setMoreOpen((v) => !v)}
            dataAttr="more"
            trailingIcon={<ChevronDown className={`h-3 w-3 transition ${moreOpen ? 'rotate-180' : ''}`} />}
          />
          {moreOpen ? (
            <div
              className="orb-action-more-menu absolute left-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-[#CBD5E1] bg-white py-1 shadow-lg"
              role="menu"
            >
              {moreActions.map((action, index) => (
                <div key={index} className="px-1" role="none">
                  {action}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ActionChip({
  icon,
  label,
  onClick,
  dataAttr,
  trailingIcon
}: {
  icon?: ReactNode
  label: string
  onClick: () => void
  dataAttr?: string
  trailingIcon?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="orb-action-chip inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/50"
      data-orb-action-chip={dataAttr}
    >
      {icon}
      {label}
      {trailingIcon}
    </button>
  )
}
