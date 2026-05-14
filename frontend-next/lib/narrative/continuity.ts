import type { ChildJourneyData } from '@/lib/child-journey/data'

export type NarrativeContinuitySummary = {
  whatChanged: string
  unresolvedThemes: string[]
  recurringThemes: string[]
  progressSummary: string[]
  emotionalContinuity: string
  placementJourney: string
  relationshipMarkers: string[]
  childVoiceContinuity: string
  todayMatteredBecause: string
}

const themePatterns: Array<[string, RegExp]> = [
  ['safeguarding', /\b(safeguarding|missing|police|risk|unsafe|harm|concern)\b/i],
  ['education', /\b(school|education|teacher|timetable|attendance|homework)\b/i],
  ['routine', /\b(routine|sleep|meal|morning|evening|bedtime|hygiene)\b/i],
  ['wellbeing', /\b(settled|anxious|heightened|low mood|withdrawn|emotional|wellbeing)\b/i],
  ['relationships', /\b(family|contact|staff|key worker|social worker|friend|peer)\b/i],
  ['progress', /\b(progress|achiev|positive|joined|enjoyed|settled|confident|praised)\b/i]
]

function textFor(item: { title?: string; summary?: string; description?: string }) {
  return `${item.title || ''} ${item.summary || ''} ${item.description || ''}`
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function buildNarrativeContinuity(data: ChildJourneyData): NarrativeContinuitySummary {
  const childName = data.child?.preferredName || data.child?.displayName || 'This child'
  const records = [...data.timeline, ...data.dailyNotes]
  const latest = records[0]
  const themeHits = themePatterns.flatMap(([theme, pattern]) => records.filter((item) => pattern.test(textFor(item))).map(() => theme))
  const recurringThemes = unique(themeHits.filter((theme) => themeHits.filter((item) => item === theme).length > 1))
  const unresolvedThemes = data.actions
    .filter((action) => ['open', 'overdue', 'in_progress', 'review'].includes(action.status))
    .slice(0, 4)
    .map((action) => action.title)
  const progressSummary = records
    .filter((item) => /\b(progress|achiev|positive|joined|enjoyed|settled|confident|praised)\b/i.test(textFor(item)))
    .slice(0, 4)
    .map((item) => item.title)
  const relationshipMarkers = records
    .filter((item) => /\b(family|contact|staff|key worker|social worker|friend|peer|relationship)\b/i.test(textFor(item)))
    .slice(0, 4)
    .map((item) => item.title)
  const voiceRecord = records.find((item) => /\b(said|told staff|wishes|feelings|choice|preferred)\b/i.test(textFor(item)))

  return {
    whatChanged: data.story.whatChanged || latest?.summary || 'No recent change has been recorded yet.',
    unresolvedThemes,
    recurringThemes,
    progressSummary,
    emotionalContinuity: latest?.summary
      ? `${childName}'s latest presentation is carried forward from: ${latest.summary}`
      : 'Emotional wellbeing continuity will build from daily notes, keywork and chronology.',
    placementJourney: data.child?.placementStatus
      ? `${childName} is in an ${data.child.placementStatus} placement; review daily evidence against placement goals.`
      : 'Placement journey detail will show when placement status is available.',
    relationshipMarkers,
    childVoiceContinuity: voiceRecord
      ? `Child voice appears in ${voiceRecord.title}. Keep carrying forward wishes, feelings and choices.`
      : 'Child voice is not yet strong in the visible story.',
    todayMatteredBecause: data.story.todayMatteredBecause || `${childName}'s day still needs recording.`
  }
}
