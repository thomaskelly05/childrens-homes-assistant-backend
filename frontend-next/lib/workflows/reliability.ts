export type WorkflowReliabilityState =
  | 'not_saved'
  | 'draft'
  | 'saving'
  | 'saved'
  | 'review'
  | 'offline_draft'
  | 'retry_needed'
  | 'stale_session'

export type WorkflowReliabilitySnapshot = {
  state: WorkflowReliabilityState
  label: string
  message: string
  retryable?: boolean
  updatedAt?: string
}

const states: Record<WorkflowReliabilityState, Omit<WorkflowReliabilitySnapshot, 'state' | 'updatedAt'>> = {
  not_saved: {
    label: 'Not saved',
    message: 'This record has not been saved yet.'
  },
  draft: {
    label: 'Draft held locally',
    message: 'Your words are in a child-scoped local draft until a live save confirms.'
  },
  saving: {
    label: 'Saving',
    message: 'Writing the record once and reconciling the response.'
  },
  saved: {
    label: 'Saved',
    message: 'The backend confirmed the record write.'
  },
  review: {
    label: 'Pending review',
    message: 'The record is saved and waiting for manager review or approval.'
  },
  offline_draft: {
    label: 'Offline draft',
    message: 'You appear offline. The record is local only and must be retried.'
  },
  retry_needed: {
    label: 'Retry needed',
    message: 'The live write failed. A child-scoped draft was retained.',
    retryable: true
  },
  stale_session: {
    label: 'Stale tab',
    message: 'Another tab changed this draft. Review before saving to avoid overwriting newer words.',
    retryable: true
  }
}

export function saveStateFromStatus(status: string | null | undefined): WorkflowReliabilitySnapshot {
  const key = String(status || 'saved').toLowerCase().replaceAll('-', '_')
  const state: WorkflowReliabilityState =
    key === 'saved' || key === 'approved' ? 'saved'
      : key === 'saving' ? 'saving'
        : key === 'review' || key === 'pending_review' || key === 'reviewed' || key === 'amendment_requested' ? 'review'
          : key === 'offline' || key === 'offline_draft' ? 'offline_draft'
            : key === 'retrying' || key === 'retry_needed' || key === 'conflicted' ? 'retry_needed'
              : key === 'stale' || key === 'stale_session' ? 'stale_session'
                : key === 'draft' ? 'draft'
                  : 'not_saved'
  return {
    state,
    ...states[state],
    updatedAt: new Date().toISOString()
  }
}
