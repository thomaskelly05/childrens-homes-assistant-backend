export type OrbAssistivePrompt = {
  id: string
  copy: string
  dismissible: true
  evidenceLinked: true
}

export const orbAssistivePrompts: OrbAssistivePrompt[] = [
  { id: 'missing_protocol_review', copy: "Jamie's missing protocol review is overdue.", dismissible: true, evidenceLinked: true },
  { id: 'unresolved_handover_actions', copy: 'There are two unresolved actions from handover.', dismissible: true, evidenceLinked: true },
  { id: 'missing_debrief', copy: 'The debrief has not been recorded yet.', dismissible: true, evidenceLinked: true },
  { id: 'prepare_handover', copy: "Would you like me to prepare tonight's handover?", dismissible: true, evidenceLinked: true },
  { id: 'weak_child_voice', copy: 'This note may benefit from child voice.', dismissible: true, evidenceLinked: true }
]

