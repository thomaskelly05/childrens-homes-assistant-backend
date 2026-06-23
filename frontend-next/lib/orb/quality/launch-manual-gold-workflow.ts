export type ManualGoldWorkflowStep = {
  id: string
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  completed: boolean
}

export type ManualGoldWorkflowInput = {
  liveLlmAvailable: boolean
  internalBrainHighRiskPassed: boolean
  liveGoldRunCompleted: boolean
  highRiskHumanReviewed: boolean
}

export const MANUAL_GOLD_WORKFLOW_INTRO =
  'OPENAI_API_KEY is not configured in this environment. Use the manual closed-pilot verification path below — synthetic GOLD scenarios only, never real child records.'

export function buildManualGoldWorkflow(input: ManualGoldWorkflowInput): ManualGoldWorkflowStep[] {
  return [
    {
      id: 'internal-brain-high-risk',
      title: 'Run internal-brain high-risk pack',
      description:
        'Execute the internal-brain high-risk test from ORB Evaluation. This checks routing, safeguards and fallback logic without calling OpenAI.',
      actionHref: '/founder/orb-evaluation',
      actionLabel: 'Open ORB Evaluation',
      completed: input.internalBrainHighRiskPassed
    },
    {
      id: 'gold-scenarios-staging',
      title: input.liveLlmAvailable
        ? 'Run live-llm GOLD pack in Quality Lab'
        : 'Obtain live ORB answers in staging',
      description: input.liveLlmAvailable
        ? 'Run the GOLD scenario pack in live-llm mode from Quality Lab.'
        : 'In a staging deployment with OPENAI_API_KEY configured, run the GOLD pack in live-llm mode. Export high-risk scenario answers for founder review.',
      actionHref: '/founder/quality-lab',
      actionLabel: 'Open Quality Lab',
      completed: input.liveGoldRunCompleted
    },
    {
      id: 'manual-paste-eval',
      title: 'Paste and evaluate high-risk GOLD answers',
      description:
        'When live-llm is unavailable locally, paste each high-risk GOLD answer into Quality Lab manual eval. Use scenario IDs from the GOLD bank (e.g. GOLD-015, GOLD-054).',
      actionHref: '/founder/quality-lab',
      actionLabel: 'Manual eval panel',
      completed: input.liveGoldRunCompleted
    },
    {
      id: 'human-review',
      title: 'Complete human review of high-risk scenarios',
      description:
        'Review each high-risk or critical GOLD result and record reviewed-pass, reviewed-concern, or reviewed-fail. Closed pilot requires all high-risk items reviewed.',
      actionHref: '/founder/quality-lab',
      actionLabel: 'Review latest run',
      completed: input.highRiskHumanReviewed
    },
    {
      id: 'privacy-retention-public-only',
      title: 'Privacy & retention review (public launch only)',
      description:
        'Record privacy and retention governance sign-off before public launch. Closed pilot does not require this step.',
      actionHref: '/founder/quality-lab',
      actionLabel: 'Governance panel',
      completed: false
    }
  ]
}

export function manualGoldWorkflowRequired(input: Pick<ManualGoldWorkflowInput, 'liveLlmAvailable'>): boolean {
  return !input.liveLlmAvailable
}
