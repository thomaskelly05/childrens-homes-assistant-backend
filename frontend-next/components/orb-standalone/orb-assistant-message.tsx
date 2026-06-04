'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, Copy, FileText, MoreHorizontal, RotateCcw, Sparkles, Square, Volume2 } from 'lucide-react'

import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import {
  contextualSuggestedRepliesForOutput as contextualOutputReplies,
  type OrbSuggestedReplyItem
} from '@/lib/orb/orb-output-reuse'

import { OrbHueMark } from '@/components/orb-standalone/orb-hue-logo'
import { profileInitialsFromName } from '@/lib/orb/orb-profile-initials'
import { OrbExplainabilityPanel, type OrbExplainabilityView } from '@/components/orb-standalone/orb-explainability-panel'
import { OrbMarkdownAnswer } from '@/components/orb-standalone/orb-markdown-answer'
import { logOrbCognitionDebug } from '@/lib/orb/standalone-client'
import { cognitionPillLabel, collectCognitionDisplayLabels, type CognitionPillContext } from '@/lib/orb/residential-agents'
import {
  normalizeOrbBrainMetadata,
  orbBrainIndicatorLabel,
  shouldShowOrbBrainIndicator
} from '@/lib/orb/orb-brain-metadata'
import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'
import type { StandaloneOrbModelRouting } from '@/lib/orb/standalone-client'
import {
  extractAnswerQualityGate,
  extractIndicareIntelligenceCore,
  shouldShowManagerOversightCta,
  shouldShowRecordProperlyCta,
  buildIntelligenceContextActionChips
} from '@/lib/orb/indicare-intelligence-core'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import { sanitiseOrbUserFacingStatus } from '@/lib/orb/orb-user-facing-copy'
import { OrbIntelligenceActionCtas } from '@/components/orb-standalone/orb-intelligence-core-panel'

const OrbIntelligenceCorePanel = dynamic(
  () =>
    import('@/components/orb-standalone/orb-intelligence-core-panel').then(
      (mod) => mod.OrbIntelligenceCorePanel
    ),
  { ssr: false, loading: () => null }
)

function lensChipLabels(
  mode: string,
  explainability?: OrbExplainabilityView,
  messageHint?: string,
  cognitionContext?: CognitionPillContext
): string[] {
  const summary = cognitionPillLabel(mode, explainability, messageHint, cognitionContext)
  if (!summary || summary === 'ORB') return []
  const fromExplainability = collectCognitionDisplayLabels(
    explainability,
    cognitionContext,
    messageHint
  )
  if (fromExplainability.length) return fromExplainability
  return summary.split(' · ').map((part) => part.trim()).filter(Boolean)
}

function stripSourcesBasisSection(content: string): string {
  return content.replace(/\n+Sources\s*\/\s*basis[\s\S]*$/i, '').trimEnd()
}

export function OrbAssistantSpeakerAvatar({ streaming }: { streaming?: boolean }) {
  return (
    <div
      className="orb-speaker-avatar orb-speaker-avatar--assistant shrink-0"
      aria-label="ORB"
      data-orb-speaker-avatar="assistant"
    >
      <OrbHueMark pulse={streaming} />
    </div>
  )
}

export function OrbUserSpeakerAvatar({ initials }: { initials: string }) {
  const label = initials === 'You' ? 'You' : `You (${initials})`
  return (
    <div
      className="orb-speaker-avatar orb-speaker-avatar--user flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#CBD5E1] bg-[#E0F2FE] text-[11px] font-bold tracking-tight text-[#0369A1]"
      aria-label={label}
      data-orb-speaker-avatar="user"
      data-orb-user-initials={initials}
    >
      {initials === 'You' ? 'Y' : initials}
    </div>
  )
}

export function userInitialsFromProfileName(name: string | undefined | null): string {
  return profileInitialsFromName(name)
}

export function OrbCognitionIndicators({
  mode,
  streaming,
  explainability,
  messageHint,
  cognitionContext
}: {
  mode: string
  streaming?: boolean
  explainability?: OrbExplainabilityView
  messageHint?: string
  cognitionContext?: CognitionPillContext
}) {
  const [open, setOpen] = useState(false)
  const chips = lensChipLabels(mode, explainability, messageHint, cognitionContext)
  const label = cognitionPillLabel(mode, explainability, messageHint, cognitionContext)
  const brainMeta = normalizeOrbBrainMetadata(
    (cognitionContext?.context_used ?? undefined) as Record<string, unknown> | undefined
  )
  const brainLine = shouldShowOrbBrainIndicator(brainMeta) ? orbBrainIndicatorLabel(brainMeta) : null
  logOrbCognitionDebug('rendered pill', { label, mode, messageHint })

  if (!streaming && chips.length === 0) return null

  return (
    <div
      className="orb-lenses-used mb-2"
      data-orb-lenses-used
      data-orb-lenses-collapsed={open ? 'false' : 'true'}
    >
      {chips.length ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="orb-lenses-used__toggle flex w-full max-w-full items-center gap-1.5 rounded-lg py-0.5 text-left text-[12px] text-slate-500 transition hover:text-slate-300"
            aria-expanded={open}
            data-orb-lenses-toggle
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="min-w-0 truncate font-medium">ORB lenses used</span>
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 shrink-0 transition ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          {open ? (
            <div
              className="orb-lenses-used__panel mt-1.5 rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-2 py-2"
              data-orb-lenses-panel
            >
              <div className="orb-lenses-used__chips flex gap-1.5 overflow-x-auto pb-0.5" role="list">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="orb-lenses-used__chip shrink-0 rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[11px] text-slate-400"
                    data-orb-cognition-pill
                    role="listitem"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              {brainLine ? (
                <p className="sr-only mt-2 text-[11px]" data-orb-brain-indicator>
                  {brainLine}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {streaming ? (
        <span className="orb-electric-text mt-1 block text-[10px] orb-streaming-pulse" aria-live="polite">
          composing
        </span>
      ) : null}
    </div>
  )
}

function OrbStreamingSkeleton() {
  return (
    <div
      className="orb-stream-skeleton my-2 space-y-2"
      data-orb-stream-skeleton
      aria-hidden
    >
      <div className="h-3 w-[92%] animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
      <div className="h-3 w-[78%] animate-pulse rounded bg-slate-200/70 dark:bg-white/[0.07]" />
      <div className="h-3 w-[64%] animate-pulse rounded bg-slate-200/60 dark:bg-white/[0.05]" />
    </div>
  )
}

export function OrbAssistantMessageBody({
  content,
  sources,
  mode,
  streaming,
  streamStatus,
  explainability,
  modelRouting,
  messageHint,
  cognitionContext,
  showCognitionLabels = true,
  showExplainability = true,
  residentialSurface = false,
  heading,
  userRole,
  onRecordProperly,
  onManagerOversight
}: {
  content: string
  sources?: StandaloneOrbSource[]
  mode: string
  streaming?: boolean
  streamStatus?: string
  explainability?: OrbExplainabilityView
  modelRouting?: StandaloneOrbModelRouting
  messageHint?: string
  cognitionContext?: CognitionPillContext
  showCognitionLabels?: boolean
  showExplainability?: boolean
  residentialSurface?: boolean
  heading?: string
  userRole?: string | null
  onRecordProperly?: () => void
  onManagerOversight?: () => void
}) {
  const cognitionLabel = cognitionPillLabel(mode, explainability, messageHint, cognitionContext)
  const brainMeta = normalizeOrbBrainMetadata(
    (cognitionContext?.context_used ?? undefined) as Record<string, unknown> | undefined
  )
  const intelligenceCore = extractIndicareIntelligenceCore(
    cognitionContext?.context_used as Record<string, unknown> | undefined
  )
  const qualityGate = extractAnswerQualityGate(
    cognitionContext?.context_used as Record<string, unknown> | undefined
  )
  const developerMode = isOrbDeveloperMode()
  const displayContent = stripSourcesBasisSection(content)
  const displayStreamStatus = sanitiseOrbUserFacingStatus(streamStatus)
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    if (!streaming || displayContent.trim()) {
      setShowSkeleton(false)
      return
    }
    const timer = window.setTimeout(() => setShowSkeleton(true), 400)
    return () => window.clearTimeout(timer)
  }, [streaming, displayContent])

  return (
    <article
      className={`orb-message-assistant group flex gap-3.5 ${streaming ? 'orb-message-streaming' : ''}`}
      data-testid="orb-message-assistant"
      data-orb-brain={brainMeta?.brain ?? undefined}
      data-orb-brain-product={brainMeta?.product ?? undefined}
    >
      <OrbAssistantSpeakerAvatar streaming={streaming} />
      <div className="min-w-0 flex-1">
        {heading ? (
          <p className="mb-1 text-xs font-semibold text-[#64748B]" data-orb-message-heading>
            {heading}
          </p>
        ) : null}
        {showCognitionLabels && !residentialSurface ? (
          <OrbCognitionIndicators
            mode={mode}
            streaming={streaming}
            explainability={explainability}
            messageHint={messageHint}
            cognitionContext={cognitionContext}
          />
        ) : null}
        {streaming && displayStreamStatus && !displayContent.trim() ? (
          <p
            className="mb-1 text-[11px] text-[var(--orb-muted)]"
            data-orb-stream-inline-status
            role="status"
          >
            {displayStreamStatus}
          </p>
        ) : null}
        <div className="orb-message-content text-[15px] leading-relaxed text-[var(--orb-foreground)] md:leading-7">
          {showSkeleton && !displayContent.trim() ? <OrbStreamingSkeleton /> : null}
          {displayContent.trim() ? (
            <OrbMarkdownAnswer content={displayContent} sources={sources} />
          ) : null}
        </div>
        {showExplainability ? (
          <OrbExplainabilityPanel
            explainability={explainability}
            cognitionModeLabel={cognitionLabel}
            residentialSurface={residentialSurface}
          />
        ) : null}
        {showExplainability ? (
          <OrbSourcesDetail content={content} sources={sources} modelRouting={modelRouting} />
        ) : null}
        {!streaming && (intelligenceCore || qualityGate) ? (
          <>
            <OrbIntelligenceActionCtas
              showRecordProperly={shouldShowRecordProperlyCta(messageHint || content, intelligenceCore)}
              showManagerOversight={shouldShowManagerOversightCta(intelligenceCore, qualityGate)}
              onRecordProperly={onRecordProperly}
              onManagerOversight={onManagerOversight}
            />
            <OrbIntelligenceCorePanel
              core={intelligenceCore}
              qualityGate={qualityGate}
              showTechnicalDetails={developerMode}
              userRole={userRole}
            />
          </>
        ) : null}
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
        'recording quality',
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

export type OrbResponseFollowUpAction =
  | 'improve_wording'
  | 'more_concise'
  | 'more_detailed'
  | 'recording_wording'
  | 'child_voice'
  | 'manager_oversight'
  | 'chronology'
  | 'shift_builder'
  | 'checklist'
  | 'what_missing'
  | 'ofsted_lens'
  | 'safeguarding_lens'
  | 'nvq_evidence_map'
  | 'reflective_learning'
  | 'pd_prompts'
  | 'evidence_gaps'
  | 'learner_action_plan'
  | 'supervision_reflect'
  | 'incident_reflective'
  | 'explain_criteria'
  | 'assessor_feedback'

export type { OrbSuggestedReplyItem } from '@/lib/orb/orb-output-reuse'

/** Inline suggested replies shown under the latest completed assistant turn. */
export const ORB_INLINE_SUGGESTED_REPLIES: Array<{
  action: OrbResponseFollowUpAction
  label: string
}> = [
  { action: 'more_concise', label: 'Make this more concise' },
  { action: 'recording_wording', label: 'Convert to recording wording' },
  { action: 'what_missing', label: 'What am I missing?' },
  { action: 'ofsted_lens', label: 'Add Ofsted lens' },
  { action: 'safeguarding_lens', label: 'Add safeguarding lens' },
  { action: 'manager_oversight', label: 'Create manager oversight note' }
]

const GREETING_HINT_RE =
  /^(hi|hello|hey|yo|thanks|thank you|thankyou|good morning|good afternoon|good evening|what can you do|how can you help)\b/i

/** Contextual chips under the latest assistant answer — not above the composer. */
export function contextualSuggestedReplies(options: {
  mode: string
  messageHint?: string
  content?: string
  contextUsed?: Record<string, unknown>
}): OrbSuggestedReplyItem[] {
  const hint = (options.messageHint || options.content || '').trim()
  const modeKey = options.mode.trim().toLowerCase()

  if (!hint || GREETING_HINT_RE.test(hint)) {
    return []
  }

  if (modeKey.includes('safeguarding') || /\b(abuse|disclosure|allegation|exploitation|unsafe)\b/i.test(hint)) {
    return [
      { action: 'recording_wording', label: 'Convert to recording wording' },
      { action: 'what_missing', label: 'What am I missing?' },
      { action: 'safeguarding_lens', label: 'Add safeguarding lens' },
      { action: 'manager_oversight', label: 'Create manager oversight note' }
    ]
  }

  if (modeKey.includes('record') || /\b(restraint|physical intervention|record|wording|incident)\b/i.test(hint)) {
    return [
      { action: 'recording_wording', label: 'Convert to recording wording' },
      { action: 'what_missing', label: 'What am I missing?' },
      { action: 'safeguarding_lens', label: 'Add safeguarding lens' },
      { action: 'manager_oversight', label: 'Create manager oversight note' }
    ]
  }

  if (modeKey.includes('ofsted') || modeKey.includes('reg 44')) {
    return [
      { action: 'ofsted_lens', label: 'Add Ofsted lens' },
      {
        action: 'what_missing',
        label: 'What would Reg 44 look for?',
        prefill: 'What would Reg 44 look for in this situation?'
      },
      {
        action: 'shift_builder',
        label: 'Create action plan',
        prefill: 'Create an action plan from this.'
      }
    ]
  }

  if (
    /\b(nvq|diploma|criteria|assessor|learner|workbook|portfolio|reflective account|academy)\b/i.test(hint)
  ) {
    return [
      { action: 'nvq_evidence_map', label: 'Map to evidence' },
      { action: 'reflective_learning', label: 'Reflective account plan' },
      { action: 'pd_prompts', label: 'Assessor questions' }
    ]
  }

  if (/\b(supervision)\b/i.test(hint) && !/\b(nvq|diploma)\b/i.test(hint)) {
    return [
      { action: 'supervision_reflect', label: 'Supervision to evidence' },
      { action: 'reflective_learning', label: 'Turn into reflective learning' },
      { action: 'what_missing', label: 'What am I missing?' }
    ]
  }

  if (/\b(policy|training|document)\b/i.test(hint)) {
    return [
      { action: 'more_detailed', label: 'Policy card' },
      {
        action: 'shift_builder',
        label: 'Action plan',
        prefill: 'Create an action plan from this policy.'
      },
      {
        action: 'more_detailed',
        label: 'Staff summary',
        prefill: 'Turn this into a concise staff summary.'
      }
    ]
  }

  if (/\b(incident|restraint|safeguarding)\b/i.test(hint)) {
    const chips: Array<{ action: OrbResponseFollowUpAction; label: string }> = [
      { action: 'incident_reflective', label: 'Turn into reflective learning' },
      { action: 'recording_wording', label: 'Convert to recording wording' },
      { action: 'what_missing', label: 'What am I missing?' }
    ]
    if (/\b(safeguarding|abuse|harm|injury)\b/i.test(hint)) {
      chips.unshift({ action: 'safeguarding_lens', label: 'Add safeguarding lens' })
    }
    return chips.slice(0, 4)
  }

  return []
}

/** Contextual reuse chips for document intelligence and action-engine results. */
export function contextualSuggestedRepliesForOutput(options: {
  outputKind?: string
  content?: string
  mode?: string
  messageHint?: string
}): OrbSuggestedReplyItem[] {
  const fromOutput = contextualOutputReplies({
    outputKind: options.outputKind,
    content: options.content
  })
  if (fromOutput.length) return fromOutput
  return contextualSuggestedReplies({ mode: options.mode || 'Ask ORB', messageHint: options.messageHint })
}

export type OrbAttachmentFollowUpAction =
  | 'summarise'
  | 'safeguarding_lens'
  | 'ofsted_lens'
  | 'recording_quality'
  | 'action_plan'

export const ORB_ATTACHMENT_FOLLOW_UPS: Array<{
  action: OrbAttachmentFollowUpAction
  label: string
}> = [
  { action: 'summarise', label: 'Summarise this' },
  { action: 'safeguarding_lens', label: 'Safeguarding lens' },
  { action: 'ofsted_lens', label: 'Ofsted lens' },
  { action: 'recording_quality', label: 'Recording quality' },
  { action: 'action_plan', label: 'Action plan' }
]

export function OrbDocumentContextChips({
  actions,
  onSelect
}: {
  actions: Array<{ lens: string; label: string }>
  onSelect: (lens: string) => void
}) {
  if (!actions.length) return null
  return (
    <div
      className="mt-2 flex flex-wrap gap-1.5"
      data-orb-document-context-actions
      role="group"
      aria-label="Document intelligence actions"
    >
      {actions.map((item) => (
        <button
          key={item.lens}
          type="button"
          onClick={() => onSelect(item.lens)}
          className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-900 transition hover:bg-cyan-100"
          data-orb-document-lens={item.lens}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function OrbAskAboutThisChips({
  onSelect
}: {
  onSelect: (action: OrbAttachmentFollowUpAction) => void
}) {
  return (
    <div
      className="mt-2 flex flex-wrap gap-1.5"
      data-orb-ask-about-this
      role="group"
      aria-label="Ask about this attachment"
    >
      {ORB_ATTACHMENT_FOLLOW_UPS.map((item) => (
        <button
          key={item.action}
          type="button"
          onClick={() => onSelect(item.action)}
          className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 transition hover:bg-violet-100"
          data-orb-attachment-action={item.action}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function OrbSuggestedReplyChips({
  onSelect,
  suggestions
}: {
  onSelect: (item: OrbSuggestedReplyItem) => void
  suggestions?: OrbSuggestedReplyItem[]
}) {
  const items = suggestions?.length ? suggestions : ORB_INLINE_SUGGESTED_REPLIES
  if (!items.length) return null
  return (
    <div
      className="orb-suggested-replies-row mt-2 flex gap-1.5 overflow-x-auto pb-0.5"
      data-orb-suggested-replies
      role="group"
      aria-label="Suggested follow-ups"
    >
      {items.map((item) => (
        <button
          key={`${item.action}-${item.label}`}
          type="button"
          onClick={() => onSelect(item)}
          className="orb-suggested-reply-chip shrink-0 rounded-full border border-[var(--orb-line)] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#475569] transition hover:border-[#94A3B8] hover:text-[#0F172A]"
          data-orb-suggested-reply={item.action}
          data-orb-suggested-reply-label={item.label}
        >
          {item.label}
        </button>
      ))}
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
  exportEnabled = false,
  onInspectionPrep,
  saveFeedback = 'idle',
  onOrbFollowUp,
  isLatest = true,
  minimal = false
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
  exportEnabled?: boolean
  onInspectionPrep?: () => void
  saveFeedback?: 'idle' | 'saved' | 'already_saved' | 'failed'
  /** Run structured ORB action or composer prefill fallback for unsupported actions. */
  onOrbFollowUp?: (action: OrbResponseFollowUpAction, sourceContent: string, assistantIndex?: number) => void
  /** When false, Regenerate is hidden (older messages). */
  isLatest?: boolean
  /** Greeting / minimal local turns — hide the full action row. */
  minimal?: boolean
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (copyFeedback === 'idle') return
    const timer = window.setTimeout(() => setCopyFeedback('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [copyFeedback])

  const handleCopy = useCallback(async () => {
    const result = await copyTextToClipboard(content)
    setCopyFeedback(result === 'copied' ? 'copied' : 'failed')
  }, [content])

  const copyLabel =
    copyFeedback === 'copied' ? 'Copied' : copyFeedback === 'failed' ? 'Copy failed' : 'Copy'

  if (minimal) {
    return (
      <div
        className="orb-response-action-bar orb-response-action-bar--minimal mt-2 flex justify-end"
        data-orb-response-actions
        data-orb-response-action-bar
        data-orb-response-action-bar-minimal
      >
        <div className="relative" data-orb-action-more-menu>
          <ActionChip
            icon={<MoreHorizontal className="h-3 w-3" />}
            label={copyLabel}
            onClick={() => void handleCopy()}
            dataAttr="copy"
            state={copyFeedback === 'copied' ? 'success' : copyFeedback === 'failed' ? 'error' : undefined}
          />
        </div>
      </div>
    )
  }

  const saveLabel =
    saveFeedback === 'saved'
      ? 'Saved'
      : saveFeedback === 'already_saved'
        ? 'Already saved'
        : saveFeedback === 'failed'
          ? 'Save failed'
          : 'Save'

  const speakLabel = !synthesisAvailable
    ? 'Voice unavailable'
    : speaking
      ? 'Stop'
      : 'Speak'

  const modeKey = mode.trim().toLowerCase()
  const isRecording = modeKey === 'record this properly'
  const isStaffCoach = modeKey === 'staff coach'
  const isInspection =
    modeKey === 'ofsted lens' || modeKey === 'reg 44 / reg 45 prep' || modeKey.includes('reg 44')

  const primaryActions: ReactNode[] = [
    <ActionChip
      key="copy"
      icon={<Copy className="h-3 w-3" />}
      label={copyLabel}
      onClick={() => void handleCopy()}
      state={copyFeedback === 'copied' ? 'success' : copyFeedback === 'failed' ? 'error' : undefined}
      dataAttr="copy"
    />
  ]
  if (onRegenerate && isLatest) {
    primaryActions.push(
      <ActionChip key="regen" icon={<RotateCcw className="h-3 w-3" />} label="Regenerate" onClick={onRegenerate} dataAttr="regenerate" />
    )
  }
  primaryActions.push(
    synthesisAvailable ? (
      speaking ? (
        <ActionChip key="stop" icon={<Square className="h-3 w-3" />} label="Stop" onClick={onStop} dataAttr="speak-stop" />
      ) : (
        <ActionChip key="speak" icon={<Volume2 className="h-3 w-3" />} label="Speak" onClick={onSpeak} dataAttr="speak" />
      )
    ) : (
      <ActionChip
        key="speak-unavailable"
        icon={<Volume2 className="h-3 w-3" />}
        label={speakLabel}
        onClick={() => {}}
        disabled
        dataAttr="speak-unavailable"
      />
    )
  )
  if (onSave) {
    primaryActions.push(
      <ActionChip
        key="save"
        icon={<FileText className="h-3 w-3" />}
        label={saveLabel}
        onClick={onSave}
        state={saveFeedback === 'saved' || saveFeedback === 'already_saved' ? 'success' : saveFeedback === 'failed' ? 'error' : undefined}
        dataAttr="save"
      />
    )
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

  const orbFollowUps: Array<{ action: OrbResponseFollowUpAction; label: string }> = onOrbFollowUp
    ? [
        { action: 'improve_wording', label: 'Improve wording' },
        { action: 'more_concise', label: 'More concise' },
        { action: 'more_detailed', label: 'More detailed' },
        { action: 'recording_wording', label: 'Recording wording' },
        { action: 'child_voice', label: 'Child voice prompt' },
        { action: 'manager_oversight', label: 'Manager oversight' },
        { action: 'chronology', label: 'Chronology suggestion' },
        { action: 'shift_builder', label: 'Build shift plan' },
        { action: 'checklist', label: 'Checklist' },
        { action: 'what_missing', label: 'What am I missing?' },
        { action: 'ofsted_lens', label: 'Ofsted lens' },
        { action: 'safeguarding_lens', label: 'Safeguarding lens' }
      ]
    : []

  const moreActions: ReactNode[] = []
  if (!isRecording) {
    moreActions.push(<ActionChip key="draft-more" icon={<FileText className="h-3 w-3" />} label="Use as draft" onClick={onDraft} />)
  }
  for (const item of orbFollowUps) {
    moreActions.push(
      <ActionChip
        key={item.action}
        label={item.label}
        onClick={() => onOrbFollowUp?.(item.action, content)}
        dataAttr={item.action}
      />
    )
  }
  if (onSaveToProject) moreActions.push(<ActionChip key="project" label="Save to project" onClick={onSaveToProject} />)
  if (onActionPlan) moreActions.push(<ActionChip key="plan" label="Action plan" onClick={onActionPlan} />)
  if (onReflection) moreActions.push(<ActionChip key="reflection" label="Save reflection" onClick={onReflection} />)
  if (!isStaffCoach && onSupervision) {
    moreActions.push(<ActionChip key="supervision-more" label="Supervision prompts" onClick={onSupervision} />)
  }
  if (exportEnabled && onExport) {
    moreActions.push(<ActionChip key="export" label="Export" onClick={onExport} dataAttr="export" />)
  } else if (onExport === undefined) {
    moreActions.push(
      <ActionChip key="export-soon" label="Export coming soon" onClick={() => {}} disabled dataAttr="export-coming-soon" />
    )
  }
  if (!isInspection && onInspectionPrep) {
    moreActions.push(<ActionChip key="inspection-more" label="Inspection prep" onClick={onInspectionPrep} />)
  }
  moreActions.push(<ActionChip key="new-q" icon={<RotateCcw className="h-3 w-3" />} label="New question" onClick={onNewQuestion} />)

  return (
    <div
      className="orb-response-action-bar orb-response-action-bar--icons mt-3 flex flex-nowrap items-center gap-1 overflow-x-auto border-t border-[var(--orb-line)] pt-3"
      data-orb-response-actions
      data-orb-response-action-bar
      data-orb-response-action-bar-persistent
    >
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
  trailingIcon,
  disabled,
  state
}: {
  icon?: ReactNode
  label: string
  onClick: () => void
  dataAttr?: string
  trailingIcon?: ReactNode
  disabled?: boolean
  state?: 'success' | 'error'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`orb-action-chip inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400/60 ${
        state === 'success' ? 'orb-action-chip--success' : state === 'error' ? 'orb-action-chip--error' : ''
      }`}
      data-orb-action-chip={dataAttr}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="orb-action-chip__label">{label}</span>
      {trailingIcon}
    </button>
  )
}
