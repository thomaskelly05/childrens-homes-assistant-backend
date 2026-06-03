/** Structured prompts for ORB Residential practice workspace panels. */

export function buildOrbInspectionReadinessPrompt(input: {
  evidence: string
  focus?: 'inspector_questions' | 'readiness_questions' | 'action_plan'
}): string {
  const focusLine =
    input.focus === 'inspector_questions'
      ? 'Focus on what an inspector may look for — themes, evidence and questions, without making regulatory judgements.'
      : input.focus === 'action_plan'
        ? 'Include a practical action plan for closing gaps and strengthening evidence.'
        : 'Include readiness questions staff and managers can use to prepare.'

  return [
    'You are supporting inspection readiness for a children\'s home. ORB does not make regulatory judgements.',
    focusLine,
    'Structure your response with:',
    '1. Evidence themes noticed',
    '2. Possible gaps or missing detail',
    '3. Questions an inspector may explore',
    '4. Suggested follow-up actions (for managers/staff to decide)',
    '5. What may still be missing from the material provided',
    '',
    'Evidence / notes:',
    input.evidence.trim()
  ].join('\n')
}

export function buildOrbSafeguardingThinkingPrompt(input: {
  concern: string
  immediateRisk?: string
  context?: string
}): string {
  return [
    'Support structured safeguarding thinking for residential staff. ORB does not make safeguarding decisions — adults must follow local procedures and escalate immediate risk.',
    'Structure your response with:',
    '1. Immediate safety considerations',
    '2. Questions to ask',
    '3. Missing information',
    '4. Recording points',
    '5. Escalation considerations (for staff to apply locally)',
    '',
    'Concern:',
    input.concern.trim(),
    input.immediateRisk?.trim() ? `\nImmediate risk noted:\n${input.immediateRisk.trim()}` : '',
    input.context?.trim() ? `\nKnown vulnerabilities / context:\n${input.context.trim()}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildOrbRecordProperlyPrompt(input: {
  whatHappened: string
  whoInvolved?: string
  staffObservations?: string
  staffActions?: string
  followUp?: string
}): string {
  return [
    'Help turn residential practice notes into the right kind of professional record. ORB supports wording — staff must review before saving to systems.',
    'Structure your response with:',
    '1. Professional record (ready to adapt)',
    '2. Missing details to confirm',
    '3. Suggested wording improvements',
    '',
    'What happened:',
    input.whatHappened.trim(),
    input.whoInvolved?.trim() ? `\nWho was involved:\n${input.whoInvolved.trim()}` : '',
    input.staffObservations?.trim()
      ? `\nWhat staff saw/heard:\n${input.staffObservations.trim()}`
      : '',
    input.staffActions?.trim() ? `\nWhat staff did:\n${input.staffActions.trim()}` : '',
    input.followUp?.trim() ? `\nFollow-up needed:\n${input.followUp.trim()}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}
