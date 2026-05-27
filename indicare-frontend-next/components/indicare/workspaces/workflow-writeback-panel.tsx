'use client'

import { useState } from 'react'

import { transitionRecord, addRecordComment, requestRecordReview } from '@/lib/os-api/operational-client'
import type { LifecycleEntityType } from '@/lib/lifecycle/types'

const TRANSITIONS: Partial<Record<LifecycleEntityType, { label: string; value: string }[]>> = {
  action: [
    { label: 'Complete', value: 'complete' },
    { label: 'Reopen', value: 'reopen' },
    { label: 'Escalate', value: 'escalate' },
    { label: 'Mark overdue', value: 'mark_overdue' },
    { label: 'Management sign-off', value: 'management_sign_off' }
  ],
  daily_record: [
    { label: 'Save draft', value: 'save_draft' },
    { label: 'Submit', value: 'submit' },
    { label: 'Manager review', value: 'manager_review' },
    { label: 'Request amendment', value: 'request_amendment' },
    { label: 'Approve/lock', value: 'approve_lock' }
  ],
  incident: [
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Manager reviewed', value: 'manager_reviewed' },
    { label: 'Safeguarding reviewed', value: 'safeguarding_reviewed' },
    { label: 'Close', value: 'close' },
    { label: 'Reopen', value: 'reopen' }
  ],
  safeguarding: [
    { label: 'Concern raised', value: 'concern_raised' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Escalated', value: 'escalated' },
    { label: 'External referral', value: 'external_referral' },
    { label: 'Closed', value: 'closed' }
  ],
  risk_assessment: [
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' },
    { label: 'Review due', value: 'review_due' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Archived', value: 'archived' }
  ],
  report: [
    { label: 'Draft generated', value: 'draft_generated' },
    { label: 'Manager review', value: 'manager_review' },
    { label: 'RI review', value: 'ri_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived/exported', value: 'archived_exported' }
  ],
  reg45: [
    { label: 'Manager review', value: 'manager_review' },
    { label: 'RI review', value: 'ri_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived/exported', value: 'archived_exported' }
  ],
  lac_review: [
    { label: 'Manager review', value: 'manager_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived/exported', value: 'archived_exported' }
  ],
  document: [
    { label: 'Processing', value: 'processing' },
    { label: 'Review required', value: 'review_required' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived', value: 'archived' }
  ],
  reg44: [
    { label: 'Review required', value: 'review_required' },
    { label: 'Approved', value: 'approved' },
    { label: 'Archived', value: 'archived' }
  ]
}

export function WorkflowWritebackPanel({ entityType, recordId }: { entityType: LifecycleEntityType; recordId: string }) {
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('')
  const transitions = TRANSITIONS[entityType] || [{ label: 'Request review', value: 'manager_review' }]

  async function runTransition(transition: string) {
    setStatus(`Saving ${transition.replaceAll('_', ' ')}...`)
    try {
      const result = await transitionRecord(entityType, recordId, { transition, notes })
      setStatus(`Saved: ${result.status}`)
    } catch (error) {
      setStatus(String(error))
    }
  }

  async function comment() {
    if (!notes.trim()) return
    setStatus('Adding comment...')
    try {
      await addRecordComment(entityType, recordId, notes)
      setStatus('Comment added')
    } catch (error) {
      setStatus(String(error))
    }
  }

  async function reviewRequest() {
    setStatus('Requesting review...')
    try {
      await requestRecordReview(entityType, recordId, notes)
      setStatus('Review request created')
    } catch (error) {
      setStatus(String(error))
    }
  }

  return (
    <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Writeback</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Workflow transitions</h2>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
        placeholder="Add notes, comments or sign-off rationale..."
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {transitions.map((transition) => (
          <button key={transition.value} type="button" onClick={() => void runTransition(transition.value)} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
            {transition.label}
          </button>
        ))}
        <button type="button" onClick={() => void comment()} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Comment</button>
        <button type="button" onClick={() => void reviewRequest()} className="rounded-full border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">Request review</button>
      </div>
      {status ? <p className="mt-3 text-xs font-bold text-slate-500">{status}</p> : null}
    </div>
  )
}
