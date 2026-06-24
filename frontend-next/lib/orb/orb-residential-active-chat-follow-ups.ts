import type { OrbSuggestedReplyItem } from './orb-output-reuse.ts'
import { isStructuredDailyRecordDraft } from './recording/orb-adult-identity-language.ts'

export const RESIDENTIAL_MAX_FOLLOW_UP_CHIPS = 3

const SAFEGUARDING_HINT_RE =
  /\b(safeguard|abuse|disclos|allegat|missing from|exploit|county lines|self[- ]?harm|suicid|CSE|CCE|LADO|restraint|physical intervention|medication|police|999|ofsted|regulation 44|regulation 45|reg 44|reg 45|risk|incident|harm|injur)\b/i

const DAILY_RECORD_HINT_RE =
  /\b(daily record|key[- ]?work|shift note|log|write up|recording|contact note|handover note)\b/i

/** Calm residential follow-ups — max three chips under the latest ORB answer. */
export function contextualResidentialCalmFollowUps(options: {
  mode?: string
  messageHint?: string
  content?: string
}): OrbSuggestedReplyItem[] {
  const hint = (options.messageHint || options.content || '').trim()
  const modeKey = String(options.mode || '').trim().toLowerCase()
  const combined = `${modeKey} ${hint}`.trim()

  if (options.content && isStructuredDailyRecordDraft(options.content)) {
    return []
  }

  if (SAFEGUARDING_HINT_RE.test(combined) || modeKey.includes('safeguard')) {
    return capResidentialFollowUps([
      {
        action: 'recording_wording',
        label: 'Turn this into a record',
        prefill: 'Help me turn this into a factual, child-centred record for adult review.\n\n'
      },
      {
        action: 'what_missing',
        label: 'What may be missing?',
        prefill: 'What may be missing from this? Review facts, concerns, escalation, recording and follow-up.\n\n'
      },
      {
        action: 'manager_oversight',
        label: 'Manager oversight'
      }
    ])
  }

  if (DAILY_RECORD_HINT_RE.test(combined) || modeKey.includes('record')) {
    return capResidentialFollowUps([
      {
        action: 'recording_wording',
        label: 'Create daily record',
        prefill: 'Help me create a daily record from this, keeping the child\'s experience central.\n\n'
      },
      {
        action: 'what_missing',
        label: 'What may be missing?',
        prefill: 'What may be missing from this daily record draft?\n\n'
      },
      {
        action: 'child_voice',
        label: 'Make it more child-centred'
      }
    ])
  }

  return capResidentialFollowUps([
    {
      action: 'recording_wording',
      label: 'Turn this into a record',
      prefill: 'Help me turn this into a factual, child-centred record for adult review.\n\n'
    },
    {
      action: 'what_missing',
      label: 'What may be missing?',
      prefill: 'What may be missing from this? Review facts, concerns, escalation, recording and follow-up.\n\n'
    },
    {
      action: 'more_concise',
      label: 'Make this more concise'
    }
  ])
}

export function capResidentialFollowUps(items: OrbSuggestedReplyItem[]): OrbSuggestedReplyItem[] {
  return items.slice(0, RESIDENTIAL_MAX_FOLLOW_UP_CHIPS)
}
