export type WorkflowSaveState =
  | 'not_saved'
  | 'draft'
  | 'saving'
  | 'saved'
  | 'review'
  | 'offline_draft'
  | 'retry_needed'
  | 'stale_session'

export type WorkflowReliabilitySnapshot = {
  state: WorkflowSaveState
  label: string
  message: string
  retryable: boolean
  updatedAt: string
  source: 'server' | 'local' | 'queue' | 'none'
}

const stateCopy: Record<WorkflowSaveState, Omit<WorkflowReliabilitySnapshot, 'state' | 'updatedAt'>> = {
  not_saved: {
    label: 'Not saved yet',
    message: 'Start the record, then save when ready.',
    retryable: false,
    source: 'none'
  },
  draft: {
    label: 'Draft saved',
    message: 'Draft is safe and can be continued.',
    retryable: false,
    source: 'server'
  },
  saving: {
    label: 'Saving',
    message: 'Writing changes to the live record.',
    retryable: false,
    source: 'queue'
  },
  saved: {
    label: 'Saved',
    message: 'Latest changes are on the live record.',
    retryable: false,
    source: 'server'
  },
  review: {
    label: 'Sent for review',
    message: 'Saved and waiting in the review chain.',
    retryable: false,
    source: 'server'
  },
  offline_draft: {
    label: 'Saved on this device',
    message: 'Work will retry when the connection returns.',
    retryable: true,
    source: 'local'
  },
  retry_needed: {
    label: 'Retry needed',
    message: 'The last save did not complete. Your work is still held safely.',
    retryable: true,
    source: 'queue'
  },
  stale_session: {
    label: 'Review latest version',
    message: 'This record changed elsewhere. Compare before saving again.',
    retryable: true,
    source: 'server'
  }
}

export function workflowReliabilitySnapshot(state: WorkflowSaveState): WorkflowReliabilitySnapshot {
  return {
    state,
    ...stateCopy[state],
    updatedAt: new Date().toISOString()
  }
}

export function saveStateFromStatus(status?: string | null, options: { offline?: boolean; failed?: boolean; stale?: boolean } = {}) {
  if (options.offline) return workflowReliabilitySnapshot('offline_draft')
  if (options.failed) return workflowReliabilitySnapshot('retry_needed')
  if (options.stale) return workflowReliabilitySnapshot('stale_session')
  const normalised = (status || '').toLowerCase().replace(/\s+/g, '_')
  if (['submitted', 'pending_review', 'review_requested', 'changes_requested'].includes(normalised)) {
    return workflowReliabilitySnapshot('review')
  }
  if (['draft', 'autosaved', 'local_draft'].includes(normalised)) return workflowReliabilitySnapshot('draft')
  if (['saved', 'approved', 'completed', 'final', 'routed'].includes(normalised)) return workflowReliabilitySnapshot('saved')
  return workflowReliabilitySnapshot('not_saved')
}

export function preventDuplicateSubmit<T extends (...args: any[]) => unknown>(handler: T) {
  let pending = false
  return async (...args: Parameters<T>) => {
    if (pending) return undefined
    pending = true
    try {
      return await handler(...args)
    } finally {
      pending = false
    }
  }
}
