import type { OrbSuggestedReplyItem } from './orb-output-reuse.ts'
import {
  hasDailyRecordChatMetadata,
  type OrbChatDailyRecordMetadata
} from './orb-chat-persistence-hydration.ts'
import {
  isDailyRecordRequest,
  isStructuredDailyRecordDraft
} from './recording/orb-adult-identity-language.ts'

const DAILY_RE = /\b(daily record|key[- ]?work|shift note|log|handover)\b/i
const STRUCTURED_DAILY_DRAFT_RE =
  /\b(daily record draft|context \/ routine|what happened|young person's presentation|to complete before saving)\b/i
const ACTIVITY_PROMPT_RE = /\b(activity record|football|outing|trip|club|swimming|cinema)\b/i
const BEDTIME_PROMPT_RE = /\b(bedtime routine|bedtime|settle at night|sleep routine)\b/i

export const DAILY_RECORD_TEMPLATE_ID = 'daily_record'
export const ROUTINE_DAILY_UNRELATED_TEMPLATE_IDS = new Set([
  'activity_record',
  'bedtime_routine_record',
  'morning_routine_record',
  'child_voice_note'
])

const ROUTINE_TEMPLATE_LABEL_RES = [
  /use activity record template/i,
  /use bedtime routine record template/i,
  /use morning routine record template/i,
  /use child voice note template/i
]

export type OrbChatChipContext = {
  content: string
  messageHint?: string
} & Partial<OrbChatDailyRecordMetadata> & {
    feedbackContext?: { detected_family?: string }
  }

export type OrbChatChipTraceEntry = {
  action: string
  label: string
  template_id?: string
  source: string
}

export function combinedChipText(ctx: OrbChatChipContext): string {
  return `${ctx.messageHint || ''}\n${ctx.content || ''}`.trim()
}

function isRoutineDailyRecordDraftContext(content: string): boolean {
  return DAILY_RE.test(content) && STRUCTURED_DAILY_DRAFT_RE.test(content)
}

export function isDailyRecordHandoffChipContext(ctx: OrbChatChipContext): boolean {
  if (hasDailyRecordChatMetadata(ctx)) return true
  const content = String(ctx.content || '')
  const hint = String(ctx.messageHint || '')
  if (isStructuredDailyRecordDraft(content)) return true
  if (isRoutineDailyRecordDraftContext(content)) return true
  if (isDailyRecordRequest(hint) && isStructuredDailyRecordDraft(content)) return true
  const combined = combinedChipText(ctx)
  return isDailyRecordRequest(hint) && DAILY_RE.test(combined) && STRUCTURED_DAILY_DRAFT_RE.test(content)
}

export function shouldSuggestTemplateForRoutineDailyRecord(templateId: string, content: string): boolean {
  if (!ROUTINE_DAILY_UNRELATED_TEMPLATE_IDS.has(templateId)) return true
  if (templateId === 'activity_record') return ACTIVITY_PROMPT_RE.test(content)
  if (templateId === 'bedtime_routine_record' || templateId === 'morning_routine_record') {
    return BEDTIME_PROMPT_RE.test(content)
  }
  return true
}

export function dailyRecordTemplateChip(): OrbSuggestedReplyItem {
  return {
    action: 'use_template_in_write',
    label: 'Open in ORB Write using Daily Record template',
    prefill: 'Open this daily record draft in ORB Write:\n\n',
    template_id: DAILY_RECORD_TEMPLATE_ID
  }
}

export function dailyRecordSaveChip(): OrbSuggestedReplyItem {
  return {
    action: 'save_to_records',
    label: 'Save to Records & Drafts'
  }
}

export function buildDailyRecordHandoffChips(): OrbSuggestedReplyItem[] {
  return [dailyRecordTemplateChip(), dailyRecordSaveChip()]
}

export function suggestionKey(item: OrbSuggestedReplyItem): string {
  return `${item.action}:${item.label.trim().toLowerCase()}`
}

function traceVisibleChatChips(ctx: OrbChatChipContext, chips: OrbChatChipTraceEntry[]): void {
  if (process.env.NODE_ENV !== 'development') return
  console.debug('[orb-chat-chips]', {
    hint: ctx.messageHint?.slice(0, 120),
    chips
  })
}

/** Final dedupe/filter layer immediately before rendering visible chips. */
export function filterVisibleChatChips(
  items: OrbSuggestedReplyItem[],
  ctx: OrbChatChipContext,
  maxVisible = 3
): OrbSuggestedReplyItem[] {
  if (isDailyRecordHandoffChipContext(ctx)) {
    const handoff = buildDailyRecordHandoffChips()
    traceVisibleChatChips(
      ctx,
      handoff.map((chip) => ({
        action: chip.action,
        label: chip.label,
        template_id: chip.template_id,
        source: 'daily_record_handoff_override'
      }))
    )
    return handoff.slice(0, maxVisible)
  }

  const combined = combinedChipText(ctx)
  const suppressRoutineTemplates = DAILY_RE.test(combined) || isDailyRecordRequest(ctx.messageHint || '')
  const filtered: OrbSuggestedReplyItem[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const key = suggestionKey(item)
    if (seen.has(key)) continue

    if (suppressRoutineTemplates) {
      if (item.template_id && !shouldSuggestTemplateForRoutineDailyRecord(item.template_id, combined)) {
        continue
      }
      if (
        !item.template_id &&
        ROUTINE_TEMPLATE_LABEL_RES.some((pattern) => pattern.test(item.label)) &&
        !shouldSuggestTemplateForRoutineDailyRecord(
          item.label.toLowerCase().includes('activity')
            ? 'activity_record'
            : item.label.toLowerCase().includes('bedtime')
              ? 'bedtime_routine_record'
              : item.label.toLowerCase().includes('child voice')
                ? 'child_voice_note'
                : 'morning_routine_record',
          combined
        )
      ) {
        continue
      }
    }

    seen.add(key)
    filtered.push(item)
    if (filtered.length >= maxVisible) break
  }

  if (filtered.length) {
    traceVisibleChatChips(
      ctx,
      filtered.map((chip) => ({
        action: chip.action,
        label: chip.label,
        template_id: chip.template_id,
        source: 'merged_filter'
      }))
    )
  }

  return filtered
}

export function mergeFollowUpsWithTemplateSuggestions(
  followUps: OrbSuggestedReplyItem[],
  templateSuggestions: OrbSuggestedReplyItem[],
  maxVisible = 3,
  ctx?: OrbChatChipContext
): OrbSuggestedReplyItem[] {
  if (ctx && isDailyRecordHandoffChipContext(ctx)) {
    return filterVisibleChatChips(buildDailyRecordHandoffChips(), ctx, maxVisible)
  }

  const merged: OrbSuggestedReplyItem[] = []
  const seen = new Set<string>()
  for (const item of [...templateSuggestions, ...followUps]) {
    const key = suggestionKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
    if (merged.length >= maxVisible) break
  }

  return ctx ? filterVisibleChatChips(merged, ctx, maxVisible) : merged
}
