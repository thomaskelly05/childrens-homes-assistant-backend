/**
 * Child-centred section prompts for residential recording templates.
 * Single supplement merged into ORB Write / Dictate — not a duplicate template source.
 */

export const ORB_THERAPEUTIC_RECORDING_PRINCIPLES: readonly string[] = [
  'The child remains central',
  'Behaviour is communication',
  'Use factual, observable language',
  'Separate observation from interpretation',
  'Avoid blaming or shaming language',
  'Avoid diagnosis unless recorded from an appropriate professional source',
  "Include the child's voice where known",
  'Include adult response, not just child behaviour',
  'Include context, triggers, de-escalation and repair where relevant',
  'Include follow-up, review and management oversight',
  'Adult remains responsible for final wording'
]

export type OrbRecordingSectionPrompt = { title: string; prompt: string }

export const ORB_PRIMARY_RECORD_TYPE_IDS = [
  'general_dictation',
  'daily_record',
  'incident_report',
  'handover',
  'key_work_session',
  'chronology_entry',
  'safeguarding_concern',
  'behaviour_reflection',
  'supervision_preparation',
  'manager_summary',
  'reg_44_evidence_summary',
  'reg_45_reflection',
  'action_plan'
] as const

export const ORB_RECORDING_SECTION_PROMPTS: Record<string, OrbRecordingSectionPrompt[]> = {
  general_dictation: [
    { title: 'Summary', prompt: 'Briefly summarise the note, keeping the child central.' },
    {
      title: 'What was observed or shared',
      prompt: 'Describe what was seen, heard or shared. Separate facts from interpretation.'
    },
    {
      title: "Child's voice and presentation",
      prompt: 'Include what the child said, showed, communicated or may have been expressing through behaviour.'
    },
    {
      title: 'Adult response',
      prompt: 'Describe how adults responded, supported, reassured, de-escalated or followed the plan.'
    },
    { title: 'Outcome', prompt: 'Record what changed by the end and how the child appeared afterwards.' },
    {
      title: 'Follow-up / management oversight',
      prompt: 'Record actions, notifications, escalation, review or further support needed.'
    }
  ],
  daily_record: [
    { title: 'Overview of the day', prompt: 'Summarise the shift with the child at the centre — not a list of tasks.' },
    {
      title: "Child's presentation",
      prompt: 'Describe how the child appeared, felt or presented through the day. Use observable language.'
    },
    {
      title: 'Meaningful interactions',
      prompt: 'Record significant conversations, play, repair or connection — what mattered to the child.'
    },
    {
      title: 'Routines, education, health and appointments',
      prompt: 'Note routines, school, health or appointments and how the child experienced them.'
    },
    {
      title: "Child's voice, wishes or feelings",
      prompt: 'Include what the child said, wished for or communicated about their day.'
    },
    {
      title: 'Progress, strengths and positives',
      prompt: 'Record strengths, progress or moments that went well — balance is important.'
    },
    {
      title: 'Concerns, changes or triggers',
      prompt: 'Note any concerns, changes in presentation or possible triggers without blame.'
    },
    { title: 'Follow-up for next shift', prompt: 'What should the next team know, monitor or continue?' }
  ],
  incident_report: [
    { title: 'Brief summary', prompt: 'A short factual overview — child-centred, without conclusions.' },
    {
      title: 'What happened before the incident',
      prompt: 'Describe context, triggers or events leading up. Separate facts from interpretation.'
    },
    { title: 'What was observed', prompt: 'Record observable behaviour and events in clear, non-judgemental language.' },
    {
      title: "Child's presentation and possible communication",
      prompt: 'What might this behaviour have been communicating? Include the child’s words if known.'
    },
    {
      title: 'Adult response and de-escalation',
      prompt: 'Describe adult actions, de-escalation, support offered and what helped or did not.'
    },
    { title: 'Harm, injury or damage', prompt: 'State injuries, harm or damage factually, or record that none were observed.' },
    {
      title: 'Notifications and safeguarding actions',
      prompt: 'Who was informed and what safeguarding steps were taken in line with policy?'
    },
    {
      title: 'Repair, reflection and follow-up',
      prompt: 'How was the relationship repaired? What follow-up does the child need?'
    },
    { title: 'Management oversight', prompt: 'Manager review, escalation or further oversight required.' }
  ],
  handover: [
    { title: 'Key update', prompt: 'The most important information for the incoming team, child-centred.' },
    { title: "Child's current presentation", prompt: 'How is the child now — mood, needs, regulation, location?' },
    {
      title: 'Risks or vulnerabilities for next shift',
      prompt: 'Highlight risks, triggers or vulnerabilities without alarmist language.'
    },
    {
      title: 'Important routines, appointments or tasks',
      prompt: 'Medication, appointments, education or routines the next team must know.'
    },
    { title: 'What helped today', prompt: 'Strategies, people or approaches that supported the child today.' },
    { title: 'What to avoid or monitor', prompt: 'Triggers to avoid or presentation to watch for next shift.' },
    { title: 'Management or safeguarding notes', prompt: 'Outstanding manager actions or safeguarding flags to pass on.' }
  ],
  key_work_session: [
    { title: 'Purpose of session', prompt: 'Why this session took place and what the child was invited to explore.' },
    {
      title: 'What the child shared or communicated',
      prompt: 'Record what the child said, showed or engaged with — their words where possible.'
    },
    {
      title: "Child's wishes, feelings and views",
      prompt: 'Include the child’s wishes, feelings or views on the topic discussed.'
    },
    { title: 'Themes explored', prompt: 'Key themes, goals or life-story elements explored without over-interpreting.' },
    {
      title: 'Adult response and support offered',
      prompt: 'How adults listened, validated, supported or co-regulated during the session.'
    },
    { title: 'Strengths and progress', prompt: 'Strengths the child showed and progress towards their goals.' },
    { title: 'Agreed actions or follow-up', prompt: 'What was agreed with the child and what happens next.' }
  ],
  chronology_entry: [
    { title: 'Date and time', prompt: 'When did this occur? Be as precise as known.' },
    { title: 'Event or significant information', prompt: 'What happened or was shared — factual and concise.' },
    { title: 'Source of information', prompt: 'Who reported this or where the information came from.' },
    { title: 'Child impact or relevance', prompt: 'Why this matters for the child’s story, plan or safety.' },
    { title: 'Action taken', prompt: 'What adults did in response at the time.' },
    { title: 'Follow-up needed', prompt: 'Further action, review or plan update required.' }
  ],
  safeguarding_concern: [
    { title: 'Concern or information shared', prompt: 'What concern arose — factual, without speculation as fact.' },
    { title: 'Immediate safety considerations', prompt: 'What was done immediately to keep the child safe?' },
    { title: 'What is known factually', prompt: 'Separate what is known from what remains unclear.' },
    { title: 'What remains unclear', prompt: 'Gaps in information that need further exploration.' },
    {
      title: "Child's voice, wishes or presentation",
      prompt: 'What did the child say, show or communicate? Include their words where possible.'
    },
    {
      title: 'Action taken in line with policy',
      prompt: 'Steps taken following safeguarding policy — adult decisions, not ORB conclusions.'
    },
    { title: 'Who was informed', prompt: 'DSL, manager, social worker or other agencies informed.' },
    {
      title: 'Further escalation or management oversight needed',
      prompt: 'What further escalation, review or management oversight is needed?'
    }
  ],
  behaviour_reflection: [
    { title: 'Behaviour observed', prompt: 'Describe observable behaviour factually — avoid labels or blame.' },
    { title: 'Context before the behaviour', prompt: 'What was happening before? Triggers, transitions or unmet needs?' },
    {
      title: 'Possible communication or unmet need',
      prompt: 'What might this behaviour be communicating? Stay curious, not diagnostic.'
    },
    { title: 'Adult response', prompt: 'How did adults respond, co-regulate or follow the plan?' },
    { title: 'What helped or escalated', prompt: 'What de-escalated or escalated the situation?' },
    { title: 'Outcome', prompt: 'How did things end for the child? Presentation afterwards.' },
    { title: 'Learning for future support', prompt: 'What might help next time — for the child and the team.' }
  ],
  supervision_preparation: [
    { title: 'Key issues to discuss', prompt: 'Practice issues, cases or situations to bring to supervision.' },
    { title: 'Practice reflection', prompt: 'What went well? What was difficult? How did you feel?' },
    { title: 'Recording or evidence questions', prompt: 'Questions about recording quality, gaps or evidence.' },
    { title: 'Child-centred concerns', prompt: 'Concerns about a child’s experience, voice or outcomes.' },
    { title: 'Support needed', prompt: 'What support do you need from your supervisor?' },
    { title: 'Actions to agree', prompt: 'Actions or learning to agree in supervision.' }
  ],
  manager_summary: [
    { title: 'Matter reviewed', prompt: 'What record, incident or practice area is being reviewed?' },
    { title: 'Evidence considered', prompt: 'What evidence or records informed this oversight?' },
    { title: 'Child impact', prompt: 'How has this affected the child’s experience, safety or progress?' },
    { title: 'Practice strengths', prompt: 'What practice strengths were observed?' },
    { title: 'Gaps or concerns', prompt: 'Gaps, concerns or questions requiring professional curiosity.' },
    {
      title: 'Management decision or direction',
      prompt: 'Manager decision or direction — adult accountability, not ORB conclusions.'
    },
    { title: 'Actions and review date', prompt: 'Actions with owners, timescales and review date.' }
  ],
  reg_44_evidence_summary: [
    { title: 'Area reviewed', prompt: 'Which area of practice or provision was reviewed?' },
    { title: 'Evidence available', prompt: 'What records, observations or evidence were considered?' },
    { title: "Child's experience", prompt: 'How do records reflect the child’s lived experience?' },
    { title: 'Practice strengths', prompt: 'Strengths in practice that support good outcomes for children.' },
    { title: 'Gaps or risks', prompt: 'Gaps, risks or areas needing development — balanced and factual.' },
    {
      title: 'Actions for manager/provider consideration',
      prompt: 'Suggested actions for manager or provider — adult decision required.'
    }
  ],
  reg_45_reflection: [
    { title: 'Quality of care reflection', prompt: 'Reflect on quality of care — what does practice show?' },
    { title: 'Outcomes for children', prompt: 'What outcomes are evident for children in placement?' },
    {
      title: 'Views, wishes and experiences',
      prompt: 'How are children’s views, wishes and experiences represented?'
    },
    { title: 'Safeguarding and protection', prompt: 'How is safeguarding practice evidenced?' },
    { title: 'Leadership and management oversight', prompt: 'How is leadership and oversight demonstrated?' },
    { title: 'Strengths and areas for development', prompt: 'Balanced strengths and development areas.' },
    { title: 'Actions and evidence needed', prompt: 'Improvement actions and evidence required.' }
  ],
  action_plan: [
    { title: 'Issue or improvement area', prompt: 'What needs to improve and why — linked to the child’s needs.' },
    { title: 'Desired outcome for the child', prompt: 'What positive outcome is sought for the child?' },
    { title: 'Actions required', prompt: 'Specific, achievable actions — who will do what?' },
    { title: 'Responsible person', prompt: 'Name the adult responsible for each action.' },
    { title: 'Timescale', prompt: 'When should each action be completed?' },
    { title: 'Evidence of completion', prompt: 'How will completion be evidenced or reviewed?' },
    { title: 'Review date', prompt: 'When will progress be reviewed with the child where appropriate?' }
  ]
}

export function sectionPromptsForRecordType(recordTypeId: string): OrbRecordingSectionPrompt[] | undefined {
  return ORB_RECORDING_SECTION_PROMPTS[recordTypeId]
}

export function buildSectionPromptBody(recordTypeId: string): string | undefined {
  const sections = sectionPromptsForRecordType(recordTypeId)
  if (!sections?.length) return undefined
  const base = sections
    .map((section) => `## ${section.title}\n\n*${section.prompt}*\n`)
    .join('\n')
    .trim()
  const scaffold = structuredOutputScaffoldForRecordType(recordTypeId)
  return scaffold ? `${base}\n\n${scaffold}`.trim() : base
}

/** Optional markdown table scaffolds for record types that benefit from structured outputs. */
function structuredOutputScaffoldForRecordType(recordTypeId: string): string | undefined {
  switch (recordTypeId) {
    case 'action_plan':
      return [
        '## Action table',
        '',
        '| Action | Responsible person | Timescale | Evidence needed | Review date |',
        '| --- | --- | --- | --- | --- |',
        '| *Add each action* | | | | |'
      ].join('\n')
    case 'chronology_entry':
      return [
        '## Chronology table',
        '',
        '| Date/time | Event | Source | Child impact | Action taken | Follow-up |',
        '| --- | --- | --- | --- | --- | --- |',
        '| | | | | | |'
      ].join('\n')
    case 'safeguarding_concern':
      return [
        '## Escalation and actions',
        '',
        '| Action | Responsible person | Timescale | Evidence needed | Review date |',
        '| --- | --- | --- | --- | --- |',
        '| | | | | |'
      ].join('\n')
    case 'reg_44_evidence_summary':
      return [
        '## Evidence summary table',
        '',
        '| Evidence available | Strengths | Gaps/risks | Actions |',
        '| --- | --- | --- | --- |',
        '| | | | |'
      ].join('\n')
    case 'reg_45_reflection':
      return [
        '## Reflection summary table',
        '',
        '| Evidence available | Strengths | Gaps/risks | Actions |',
        '| --- | --- | --- | --- |',
        '| | | | |'
      ].join('\n')
    case 'handover':
      return [
        '## Tasks and risks',
        '',
        '| Task or risk | Owner | Priority | Notes |',
        '| --- | --- | --- | --- |',
        '| | | | |'
      ].join('\n')
    default:
      return undefined
  }
}
