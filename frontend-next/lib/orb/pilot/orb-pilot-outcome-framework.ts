export type OrbPilotOutcomeDataSource = 'feedback' | 'manual' | 'live-telemetry'

export type OrbPilotOutcomeEvidenceStatus =
  | 'no-data-yet'
  | 'manual-feedback'
  | 'live-telemetry-available'
  | 'needs-manager-review'

export type OrbPilotOutcomeQuestion = {
  id: string
  text: string
  dataSource: OrbPilotOutcomeDataSource
  suitableForExternalEvidence: boolean
  limitations: string
}

export type OrbPilotOutcome = {
  id: string
  title: string
  summary: string
  questions: OrbPilotOutcomeQuestion[]
}

export const ORB_PILOT_OUTCOMES: OrbPilotOutcome[] = [
  {
    id: 'time-returned',
    title: 'Time returned to direct care',
    summary: 'Whether ORB freed staff time for direct work with children.',
    questions: [
      {
        id: 'time-saved',
        text: 'Did ORB save time?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Self-reported minutes only. Not verified against system telemetry in closed pilot V1.'
      },
      {
        id: 'time-minutes',
        text: 'Roughly how many minutes?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Approximate self-report. Requires at least five responses before treating as a signal.'
      },
      {
        id: 'time-task',
        text: 'Which task did it help with?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Free-text task type is categorised manually; not suitable for external evidence without review.'
      }
    ]
  },
  {
    id: 'recording-quality',
    title: 'Recording quality',
    summary: 'Whether ORB improved clarity, structure and relevant evidence in records.',
    questions: [
      {
        id: 'record-clarity',
        text: 'Did ORB improve the clarity of the record?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Subjective staff rating. No automated record-quality scoring in closed pilot V1.'
      },
      {
        id: 'record-structure',
        text: 'Did it help structure the record?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Manual feedback only until manager review of sample records is in place.'
      },
      {
        id: 'record-evidence',
        text: 'Did it help include relevant evidence?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Does not assess factual accuracy or safeguarding completeness.'
      }
    ]
  },
  {
    id: 'child-voice',
    title: 'Child voice',
    summary: "Whether ORB helped staff keep the child's voice, wishes and feelings central.",
    questions: [
      {
        id: 'child-voice-thought',
        text: "Did ORB help you think about the child's voice, wishes or feelings?",
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Reflective self-report. Child voice must remain staff-led, not inferred by ORB alone.'
      },
      {
        id: 'child-voice-helped',
        text: 'What helped the child?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations:
          'Free-text themes are redacted and aggregated. Never suitable for external evidence without manager review and anonymisation.'
      }
    ]
  },
  {
    id: 'therapeutic-language',
    title: 'Therapeutic language',
    summary: 'Whether ORB supported therapeutic wording and behaviour-as-communication framing.',
    questions: [
      {
        id: 'therapeutic-wording',
        text: 'Did ORB help make the wording more therapeutic?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Staff judgement on wording quality. ORB does not replace professional language choices.'
      },
      {
        id: 'behaviour-communication',
        text: 'Did it support behaviour as communication?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Behaviour is communication — staff remain responsible for interpreting behaviour in context.'
      }
    ]
  },
  {
    id: 'staff-confidence',
    title: 'Staff confidence',
    summary: 'Whether ORB increased confidence and willingness to use the tool again.',
    questions: [
      {
        id: 'confidence-task',
        text: 'Did ORB make you feel more confident with the task?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Confidence is self-reported. Not a substitute for competence assessment or supervision.'
      },
      {
        id: 'would-use-again',
        text: 'Would you use ORB again?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Intent to reuse; does not measure sustained adoption across the pilot period.'
      }
    ]
  },
  {
    id: 'manager-oversight',
    title: 'Manager oversight',
    summary: 'Whether ORB outputs would help registered managers review records.',
    questions: [
      {
        id: 'manager-review',
        text: 'Would this help a manager review records more easily?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Not yet validated with registered manager review of real (anonymised) records.'
      },
      {
        id: 'manager-missing',
        text: 'Did ORB highlight anything missing?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'ORB prompts are supportive only; managers must apply professional judgement and local policy.'
      }
    ]
  },
  {
    id: 'safeguarding-ofsted',
    title: 'Safeguarding and Ofsted readiness',
    summary: 'Whether ORB reminded staff about safeguarding escalation and local policy.',
    questions: [
      {
        id: 'safeguarding-escalation',
        text: 'Did ORB remind you to consider safeguarding escalation?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Reminder presence only — not evidence of correct escalation or statutory compliance.'
      },
      {
        id: 'local-policy',
        text: 'Did it remind you to follow local policy/professional judgement?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations: 'Staff must follow organisational safeguarding procedures regardless of ORB prompts.'
      },
      {
        id: 'ofsted-ready',
        text: 'Did it feel Ofsted-ready?',
        dataSource: 'feedback',
        suitableForExternalEvidence: false,
        limitations:
          'Subjective readiness feeling. Ofsted inspection readiness requires manager oversight and real record review.'
      }
    ]
  }
]

export function getOrbPilotOutcomeById(id: string): OrbPilotOutcome | undefined {
  return ORB_PILOT_OUTCOMES.find((outcome) => outcome.id === id)
}
