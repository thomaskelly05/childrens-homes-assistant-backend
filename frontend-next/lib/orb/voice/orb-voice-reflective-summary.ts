/** Phase 4A — deterministic voice conversation summaries for adult review. */

import type { VoiceTurn } from './orb-voice-types.ts'
import {
  isSafeguardingReflectiveMode,
  type OrbVoiceReflectiveModeId
} from './orb-voice-reflective-modes.ts'
import { ORB_VOICE_ADULT_REVIEW_LABEL } from './orb-voice-reflective-copy.ts'

export type OrbVoiceSummarySection = {
  heading: string
  body: string
}

export type OrbVoiceReflectiveSummary = {
  label: typeof ORB_VOICE_ADULT_REVIEW_LABEL
  sections: OrbVoiceSummarySection[]
  markdown: string
}

function userLines(turns: VoiceTurn[]): string[] {
  return turns.filter((t) => t.role === 'user').map((t) => t.text.trim()).filter(Boolean)
}

function assistantLines(turns: VoiceTurn[]): string[] {
  return turns.filter((t) => t.role === 'assistant').map((t) => t.text.trim()).filter(Boolean)
}

function joinOrPlaceholder(lines: string[], placeholder: string): string {
  return lines.length ? lines.join('\n\n') : placeholder
}

const DEFAULT_HEADINGS = [
  'What was discussed',
  'Key reflections',
  'What may need recording',
  'Possible follow-up'
] as const

const SAFEGUARDING_HEADINGS = [
  'What happened',
  'Immediate safety / procedure considerations',
  "Child's voice or presentation",
  'Adult response',
  'What may need recording',
  'Follow-up / oversight'
] as const

const SUPERVISION_HEADINGS = [
  'What I want to discuss',
  'What happened / context',
  'Impact on practice',
  'Support needed',
  'Possible actions'
] as const

function headingsForMode(modeId: OrbVoiceReflectiveModeId): readonly string[] {
  if (modeId === 'supervision_prep') return SUPERVISION_HEADINGS
  if (isSafeguardingReflectiveMode(modeId)) return SAFEGUARDING_HEADINGS
  return DEFAULT_HEADINGS
}

export function buildOrbVoiceReflectiveSummary(
  modeId: OrbVoiceReflectiveModeId,
  turns: VoiceTurn[],
  transcriptText?: string
): OrbVoiceReflectiveSummary {
  const users = userLines(turns)
  const assistants = assistantLines(turns)
  const discussed =
    users.join('\n\n') ||
    transcriptText?.trim() ||
    'Not captured clearly in this voice session.'

  const headings = headingsForMode(modeId)
  const sections: OrbVoiceSummarySection[] = []

  if (modeId === 'supervision_prep') {
    sections.push({ heading: headings[0], body: joinOrPlaceholder(users.slice(0, 2), 'Add what you want to bring to supervision.') })
    sections.push({ heading: headings[1], body: discussed })
    sections.push({
      heading: headings[2],
      body: joinOrPlaceholder(assistants, 'Note any impact on your practice from the conversation.')
    })
    sections.push({ heading: headings[3], body: 'Add any support or supervision themes identified.' })
    sections.push({ heading: headings[4], body: 'Add any actions or learning points to agree in supervision.' })
  } else if (isSafeguardingReflectiveMode(modeId)) {
    sections.push({ heading: headings[0], body: discussed })
    sections.push({
      heading: headings[1],
      body: 'Confirm immediate safety and that your home safeguarding procedure has been followed. ORB does not decide — use local procedure.'
    })
    sections.push({
      heading: headings[2],
      body: joinOrPlaceholder(
        users.filter((l) => /\b(child|young person|said|showed|presentation)\b/i.test(l)),
        'Not clear from this conversation — add the child\'s voice or presentation if known.'
      )
    })
    sections.push({
      heading: headings[3],
      body: joinOrPlaceholder(
        users.filter((l) => /\b(i |we |staff|adult|de-escalat|support|respond)\b/i.test(l)),
        'Add what adults did to support, de-escalate or respond.'
      )
    })
    sections.push({
      heading: headings[4],
      body: joinOrPlaceholder(assistants, 'Review what may need a formal record after adult review.')
    })
    sections.push({ heading: headings[5], body: 'Add any follow-up, management or safeguarding oversight needed.' })
  } else {
    sections.push({ heading: headings[0], body: discussed })
    sections.push({
      heading: headings[1],
      body: joinOrPlaceholder(assistants, 'Add key reflections from your conversation with ORB.')
    })
    sections.push({
      heading: headings[2],
      body: joinOrPlaceholder(
        assistants.filter((l) => /record|document|write|capture/i.test(l)),
        'Review whether anything discussed should move to Dictate or ORB Write.'
      )
    })
    sections.push({ heading: headings[3], body: 'Add any follow-up, supervision or management actions.' })
  }

  const markdown = sections.map((s) => `## ${s.heading}\n\n${s.body.trim()}`).join('\n\n')

  return {
    label: ORB_VOICE_ADULT_REVIEW_LABEL,
    sections,
    markdown: `${ORB_VOICE_ADULT_REVIEW_LABEL}\n\n${markdown}`.trim()
  }
}
