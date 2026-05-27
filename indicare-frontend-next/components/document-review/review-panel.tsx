import type { DocumentTemplateSummary } from '@/lib/document-system/templates'

export function DocumentReviewPanel({ template }: { template: DocumentTemplateSummary }) {
  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Manager QA</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">Review and approval</h2>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        <p>Calm flow: draft, autosaved, submitted, under review, amendment requested, approved, escalated, archived.</p>
        <p>Owner: {template.ownerRole}. Review: {template.reviewFrequency}.</p>
        <p className="rounded-2xl bg-amber-50 p-3 font-bold text-amber-800">Review actions call the live document-system API. If the backend is unavailable, the document is not submitted or pretended to be submitted.</p>
      </div>
    </aside>
  )
}
