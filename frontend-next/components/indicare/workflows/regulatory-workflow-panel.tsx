import { WorkflowStepper } from './workflow-stepper'

const workflows = {
  daily_recording: [
    ['Create daily log', '/daily-logs', 'complete'],
    ['Link young person and tags', '/young-people', 'complete'],
    ['Identify risk or safeguarding flags', '/chronology', 'current'],
    ['Create actions and evidence', '/actions', 'review'],
    ['Use in report', '/reports', 'pending']
  ],
  incident: [
    ['Record incident', '/incidents', 'complete'],
    ['Capture triggers, response and outcome', '/incidents', 'complete'],
    ['Consider Reg 40 and safeguarding', '/regulatory/chr-reg-40', 'current'],
    ['Manager review', '/chronology', 'review'],
    ['Create actions and evidence', '/actions', 'pending']
  ],
  safeguarding: [
    ['Record concern', '/safeguarding', 'complete'],
    ['Link agencies and chronology', '/chronology', 'current'],
    ['Review risks and actions', '/risk-assessments', 'review'],
    ['Evidence SCCIF protection', '/regulatory/sccif-helped-protected', 'pending']
  ],
  reg44: [
    ['Upload or paste report', '/documents/regulatory', 'complete'],
    ['Extract findings', '/documents/regulatory', 'current'],
    ['Create action plan', '/actions', 'review'],
    ['Link completion evidence', '/evidence', 'pending'],
    ['Feed learning into Reg 45', '/reports', 'pending']
  ],
  reg45: [
    ['Gather annual evidence', '/evidence', 'current'],
    ['Identify gaps', '/inspection-readiness', 'review'],
    ['Generate draft with citations', '/reports', 'pending'],
    ['Manager review required', '/actions', 'pending']
  ],
  lac_review: [
    ['Gather child voice', '/keywork', 'current'],
    ['Review progress and care plan', '/young-people', 'current'],
    ['Attach education and health evidence', '/evidence', 'review'],
    ['Generate cited draft', '/reports', 'pending']
  ],
  manager_oversight: [
    ['Review overdue items', '/actions', 'current'],
    ['Check incidents and safeguarding', '/incidents', 'review'],
    ['Review Reg 44 actions', '/documents/regulatory', 'review'],
    ['Open sign-off readiness', '/inspection-readiness', 'pending']
  ]
} as const

export type RegulatoryWorkflowType = keyof typeof workflows

export function RegulatoryWorkflowPanel({ workflow }: { workflow: RegulatoryWorkflowType }) {
  const steps = workflows[workflow].map(([title, href, status]) => ({
    title,
    href,
    status: status as 'complete' | 'current' | 'pending' | 'review'
  }))

  return <WorkflowStepper steps={steps} />
}
