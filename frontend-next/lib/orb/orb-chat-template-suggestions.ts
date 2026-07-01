import type { OrbSuggestedReplyItem } from '@/lib/orb/orb-output-reuse'
import { searchOrbTemplateTaxonomy, type OrbTemplateTaxonomyEntry } from '@/lib/orb/orb-records-workspace-client'
import {
  buildDailyRecordHandoffChips,
  buildIncidentReflectionHandoffChips,
  combinedChipText,
  DAILY_RECORD_TEMPLATE_ID,
  filterVisibleChatChips,
  isDailyRecordHandoffChipContext,
  isHighRiskSafeguardingChipContext,
  isQ1IncidentRecordingContractAnswer,
  mergeFollowUpsWithTemplateSuggestions,
  shouldSuggestTemplateForRoutineDailyRecord,
  suggestionKey,
  type OrbChatChipContext
} from '@/lib/orb/orb-chat-chip-handoff'
import { convertAnswerToWorkingDocument } from '@/lib/orb/template/orb-template-working-document-client'
import { saveOrbWriteWorkingDocumentHandoff } from '@/lib/orb/write/orb-write-working-document-handoff'
import { isDailyRecordRequest } from '@/lib/orb/recording/orb-adult-identity-language'

export type { OrbChatChipContext, OrbChatChipTraceEntry } from '@/lib/orb/orb-chat-chip-handoff'
export {
  buildDailyRecordHandoffChips,
  buildHighRiskSafeguardingHandoffChips,
  buildIncidentReflectionHandoffChips,
  filterVisibleChatChips,
  isDailyRecordHandoffChipContext,
  isHighRiskSafeguardingChipContext,
  isQ1DailyRecordingContractAnswer,
  isQ1IncidentRecordingContractAnswer,
  mergeFollowUpsWithTemplateSuggestions,
  suggestionKey
} from '@/lib/orb/orb-chat-chip-handoff'

const SAFEGUARDING_RE =
  /\b(safeguard|abuse|disclos|allegat|missing from|exploit|self[- ]?harm|suicid|CSE|CCE|LADO|restraint|physical intervention)\b/i
const INCIDENT_RE = /\b(incident|restraint|physical intervention|behaviour|injur|harm)\b/i
const DAILY_RE = /\b(daily record|key[- ]?work|shift note|log|handover)\b/i
const MANAGER_RE = /\b(manager|oversight|review|supervision|RI|registered manager)\b/i

function localTemplateHints(content: string): string[] {
  const hints: string[] = []
  if (SAFEGUARDING_RE.test(content)) hints.push('safeguarding')
  if (INCIDENT_RE.test(content)) hints.push('incident')
  if (DAILY_RE.test(content)) hints.push('daily')
  if (MANAGER_RE.test(content)) hints.push('manager')
  if (!hints.length) hints.push('daily')
  return hints.slice(0, 3)
}

function toSuggestionChip(entry: OrbTemplateTaxonomyEntry): OrbSuggestedReplyItem {
  const isDailyRecord = entry.template_id === DAILY_RECORD_TEMPLATE_ID
  const label = isDailyRecord
    ? 'Open in ORB Write using Daily Record template'
    : entry.suggestion_label || `Use ${entry.title.toLowerCase()} template`
  return {
    action: 'use_template_in_write',
    label,
    prefill: isDailyRecord
      ? `Open this daily record draft in ORB Write:\n\n`
      : `Use the ${entry.title} template for this:\n\n`,
    template_id: entry.template_id
  }
}

/** Suggest up to 3 relevant templates after a chat answer. */
export async function fetchChatTemplateSuggestions(
  content: string,
  opts?: {
    messageHint?: string
    chatIntent?: string
    templateId?: string
    workingDocumentAvailable?: boolean
    source?: string
    feedbackContext?: { detected_family?: string }
  }
): Promise<OrbSuggestedReplyItem[]> {
  const ctx: OrbChatChipContext = { content, messageHint: opts?.messageHint, ...opts }
  if (isQ1IncidentRecordingContractAnswer(content, opts?.messageHint)) {
    return buildIncidentReflectionHandoffChips()
  }
  if (isHighRiskSafeguardingChipContext(ctx)) {
    return buildHighRiskSafeguardingHandoffChips()
  }
  if (isDailyRecordHandoffChipContext(ctx)) {
    return buildDailyRecordHandoffChips()
  }

  const combined = combinedChipText(ctx)
  const hints = localTemplateHints(combined)
  const seen = new Set<string>()
  const chips: OrbSuggestedReplyItem[] = []
  const isDailyRecordAnswer =
    !isQ1IncidentRecordingContractAnswer(content, opts?.messageHint) &&
    (DAILY_RE.test(combined) || isDailyRecordRequest(opts?.messageHint || ''))
  let dailyTemplateAdded = false

  for (const hint of hints) {
    try {
      const result = await searchOrbTemplateTaxonomy(hint, { station: 'chat' })
      const templates = [...(result.templates ?? [])]
      if (isDailyRecordAnswer) {
        templates.sort((a, b) => {
          if (a.template_id === DAILY_RECORD_TEMPLATE_ID) return -1
          if (b.template_id === DAILY_RECORD_TEMPLATE_ID) return 1
          return 0
        })
      }
      for (const entry of templates) {
        if (seen.has(entry.template_id)) continue
        if (isDailyRecordAnswer && !shouldSuggestTemplateForRoutineDailyRecord(entry.template_id, combined)) {
          continue
        }
        seen.add(entry.template_id)
        const chip = toSuggestionChip(entry)
        const chipKey = suggestionKey(chip)
        if (seen.has(chipKey)) continue
        seen.add(chipKey)
        chips.push(chip)
        if (entry.template_id === DAILY_RECORD_TEMPLATE_ID) dailyTemplateAdded = true
        if (chips.length >= 3) break
      }
    } catch {
      // Taxonomy search is best-effort; follow-up chips still work without it.
    }
    if (chips.length >= 3) break
  }

  if (isDailyRecordAnswer) {
    if (!dailyTemplateAdded) {
      const primary = dailyRecordTemplateChip()
      const primaryKey = suggestionKey(primary)
      if (!seen.has(primaryKey)) {
        chips.unshift(primary)
        seen.add(primaryKey)
      }
    }
    const saveChip = dailyRecordSaveChip()
    const saveKey = suggestionKey(saveChip)
    if (!seen.has(saveKey)) {
      const insertAt = chips.findIndex((chip) => chip.template_id === DAILY_RECORD_TEMPLATE_ID)
      if (insertAt >= 0) {
        chips.splice(insertAt + 1, 0, saveChip)
      } else {
        chips.unshift(saveChip)
      }
      seen.add(saveKey)
    }
  }

  return filterVisibleChatChips(chips.slice(0, 3), ctx, 3)
}

/** Resolve best template for turn-into-record from content. */
export async function resolveChatRecordTemplate(
  content: string,
  opts?: { messageHint?: string }
): Promise<{
  template_id?: string
  category?: string
  title?: string
}> {
  const combined = combinedChipText({ content, messageHint: opts?.messageHint })
  const hints = localTemplateHints(combined)
  for (const hint of hints) {
    try {
      const result = await searchOrbTemplateTaxonomy(hint, { station: 'chat' })
      const templates = [...(result.templates ?? [])].sort((a, b) => {
        if (a.template_id === DAILY_RECORD_TEMPLATE_ID) return -1
        if (b.template_id === DAILY_RECORD_TEMPLATE_ID) return 1
        return 0
      })
      const first = templates.find(
        (entry) =>
          entry.template_id === DAILY_RECORD_TEMPLATE_ID ||
          shouldSuggestTemplateForRoutineDailyRecord(entry.template_id, combined)
      )
      if (first) {
        return {
          template_id: first.template_id,
          category: first.lifecycle_family,
          title: first.title
        }
      }
    } catch {
      continue
    }
  }
  if (isDailyRecordHandoffChipContext({ content, messageHint: opts?.messageHint })) {
    return { template_id: DAILY_RECORD_TEMPLATE_ID, category: 'daily_recording', title: 'Daily record' }
  }
  return {}
}

/** Open a chat answer in ORB Write as a working document from the best template match. */
export async function openChatAnswerInOrbWrite(
  content: string,
  opts?: { template_id?: string; messageHint?: string; onNavigate?: () => void }
): Promise<{ template_id: string; opened: boolean }> {
  const templateId =
    opts?.template_id ??
    (await resolveChatRecordTemplate(content, { messageHint: opts?.messageHint })).template_id
  if (!templateId) return { template_id: '', opened: false }
  try {
    const doc = await convertAnswerToWorkingDocument(templateId, content, 'chat')
    saveOrbWriteWorkingDocumentHandoff(doc, {
      source_station: 'chat',
      source_label: `From chat — ${doc.title}`
    })
    opts?.onNavigate?.()
    return { template_id: templateId, opened: true }
  } catch {
    return { template_id: templateId, opened: false }
  }
}
