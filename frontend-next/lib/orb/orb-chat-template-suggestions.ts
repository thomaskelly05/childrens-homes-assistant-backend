import type { OrbSuggestedReplyItem } from '@/lib/orb/orb-output-reuse'
import { searchOrbTemplateTaxonomy, type OrbTemplateTaxonomyEntry } from '@/lib/orb/orb-records-workspace-client'
import { convertAnswerToWorkingDocument } from '@/lib/orb/template/orb-template-working-document-client'
import { saveOrbWriteWorkingDocumentHandoff } from '@/lib/orb/write/orb-write-working-document-handoff'

const SAFEGUARDING_RE =
  /\b(safeguard|abuse|disclos|allegat|missing from|exploit|self[- ]?harm|suicid|CSE|CCE|LADO|restraint|physical intervention)\b/i
const INCIDENT_RE = /\b(incident|restraint|physical intervention|behaviour|injur|harm)\b/i
const DAILY_RE = /\b(daily record|key[- ]?work|shift note|log|handover)\b/i
const MANAGER_RE = /\b(manager|oversight|review|supervision|RI|registered manager)\b/i
const STRUCTURED_DAILY_DRAFT_RE =
  /\b(daily record draft|context \/ routine|what happened|young person's presentation|to complete before saving)\b/i
const ACTIVITY_PROMPT_RE = /\b(activity|football|outing|trip|club|swimming|cinema)\b/i
const BEDTIME_PROMPT_RE = /\b(bedtime routine|bedtime|settle at night|sleep routine)\b/i

const DAILY_RECORD_TEMPLATE_ID = 'daily_record'
const ROUTINE_DAILY_UNRELATED_TEMPLATES = new Set([
  'activity_record',
  'bedtime_routine_record',
  'morning_routine_record'
])

function localTemplateHints(content: string): string[] {
  const hints: string[] = []
  if (SAFEGUARDING_RE.test(content)) hints.push('safeguarding')
  if (INCIDENT_RE.test(content)) hints.push('incident')
  if (DAILY_RE.test(content)) hints.push('daily')
  if (MANAGER_RE.test(content)) hints.push('manager')
  if (!hints.length) hints.push('daily')
  return hints.slice(0, 3)
}

function isRoutineDailyRecordDraftContext(content: string): boolean {
  return DAILY_RE.test(content) && STRUCTURED_DAILY_DRAFT_RE.test(content)
}

function shouldSuggestTemplateForRoutineDailyRecord(templateId: string, content: string): boolean {
  if (!ROUTINE_DAILY_UNRELATED_TEMPLATES.has(templateId)) return true
  if (templateId === 'activity_record') return ACTIVITY_PROMPT_RE.test(content)
  if (templateId === 'bedtime_routine_record' || templateId === 'morning_routine_record') {
    return BEDTIME_PROMPT_RE.test(content)
  }
  return true
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

function dailyRecordTemplateChip(): OrbSuggestedReplyItem {
  return {
    action: 'use_template_in_write',
    label: 'Open in ORB Write using Daily Record template',
    prefill: 'Open this daily record draft in ORB Write:\n\n',
    template_id: DAILY_RECORD_TEMPLATE_ID
  }
}

function dailyRecordSaveChip(): OrbSuggestedReplyItem {
  return {
    action: 'save_to_records',
    label: 'Save to Records & Drafts'
  }
}

function suggestionKey(item: OrbSuggestedReplyItem): string {
  return `${item.action}:${item.label.trim().toLowerCase()}`
}

/** Suggest up to 3 relevant templates after a chat answer. */
export async function fetchChatTemplateSuggestions(content: string): Promise<OrbSuggestedReplyItem[]> {
  const hints = localTemplateHints(content)
  const seen = new Set<string>()
  const chips: OrbSuggestedReplyItem[] = []
  const routineDailyDraft = isRoutineDailyRecordDraftContext(content)

  if (routineDailyDraft) {
    const primary = dailyRecordTemplateChip()
    chips.push(primary)
    seen.add(suggestionKey(primary))
    const saveChip = dailyRecordSaveChip()
    chips.push(saveChip)
    seen.add(suggestionKey(saveChip))
    return chips
  }

  const isDailyRecordAnswer = DAILY_RE.test(content)
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
        if (isDailyRecordAnswer && !shouldSuggestTemplateForRoutineDailyRecord(entry.template_id, content)) {
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

  return chips.slice(0, 3)
}

export function mergeFollowUpsWithTemplateSuggestions(
  followUps: OrbSuggestedReplyItem[],
  templateSuggestions: OrbSuggestedReplyItem[],
  maxVisible = 3
): OrbSuggestedReplyItem[] {
  const merged: OrbSuggestedReplyItem[] = []
  const seen = new Set<string>()
  for (const item of [...templateSuggestions, ...followUps]) {
    const key = suggestionKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
    if (merged.length >= maxVisible) break
  }
  return merged
}

/** Resolve best template for turn-into-record from content. */
export async function resolveChatRecordTemplate(content: string): Promise<{
  template_id?: string
  category?: string
  title?: string
}> {
  const hints = localTemplateHints(content)
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
          shouldSuggestTemplateForRoutineDailyRecord(entry.template_id, content)
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
  return {}
}

/** Open a chat answer in ORB Write as a working document from the best template match. */
export async function openChatAnswerInOrbWrite(
  content: string,
  opts?: { template_id?: string; onNavigate?: () => void }
): Promise<{ template_id: string; opened: boolean }> {
  const templateId =
    opts?.template_id ?? (await resolveChatRecordTemplate(content)).template_id
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
