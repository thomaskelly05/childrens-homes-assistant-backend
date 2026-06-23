import type { OrbSuggestedReplyItem } from '@/lib/orb/orb-output-reuse'
import { searchOrbTemplateTaxonomy, type OrbTemplateTaxonomyEntry } from '@/lib/orb/orb-records-workspace-client'

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
  const label = entry.suggestion_label || `Use ${entry.title.toLowerCase()} template`
  return {
    action: 'recording_wording',
    label,
    prefill: `Use the ${entry.title} template for this:\n\n`
  }
}

/** Suggest up to 3 relevant templates after a chat answer. */
export async function fetchChatTemplateSuggestions(content: string): Promise<OrbSuggestedReplyItem[]> {
  const hints = localTemplateHints(content)
  const seen = new Set<string>()
  const chips: OrbSuggestedReplyItem[] = []

  for (const hint of hints) {
    try {
      const result = await searchOrbTemplateTaxonomy(hint, { station: 'chat' })
      for (const entry of result.templates ?? []) {
        if (seen.has(entry.template_id)) continue
        seen.add(entry.template_id)
        chips.push(toSuggestionChip(entry))
        if (chips.length >= 3) return chips
      }
    } catch {
      // Taxonomy search is best-effort; follow-up chips still work without it.
    }
  }
  return chips
}

export function mergeFollowUpsWithTemplateSuggestions(
  followUps: OrbSuggestedReplyItem[],
  templateSuggestions: OrbSuggestedReplyItem[],
  maxVisible = 3
): OrbSuggestedReplyItem[] {
  const merged: OrbSuggestedReplyItem[] = []
  const seen = new Set<string>()
  for (const item of [...templateSuggestions, ...followUps]) {
    const key = item.label.toLowerCase()
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
      const first = result.templates?.[0]
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
