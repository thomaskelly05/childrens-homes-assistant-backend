import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { osServerPost } from '@/lib/os-api/server-client'
import { getWorkforceSupervision } from '@/lib/os-api/workforce'

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

async function createSupervision(formData: FormData) {
  'use server'
  const response = await osServerPost('/api/workforce-os/supervision', {
    staff_id: value(formData, 'staff_id') ? Number(value(formData, 'staff_id')) : undefined,
    title: value(formData, 'title') || 'Staff supervision',
    status: value(formData, 'status') || 'draft',
    reflection: value(formData, 'reflection'),
    notes: value(formData, 'notes'),
    linked_incident_ids: value(formData, 'linked_incident_id') ? [Number(value(formData, 'linked_incident_id'))] : [],
    linked_training_need_ids: value(formData, 'linked_training_need_id') ? [Number(value(formData, 'linked_training_need_id'))] : [],
    linked_wellbeing_signal_ids: value(formData, 'linked_wellbeing_signal_id') ? [Number(value(formData, 'linked_wellbeing_signal_id'))] : [],
    linked_practice_concern_ids: value(formData, 'linked_practice_concern_id') ? [Number(value(formData, 'linked_practice_concern_id'))] : [],
    actions: value(formData, 'action_title') ? [{ title: value(formData, 'action_title'), priority: 'medium', status: 'open' }] : []
  }, {})
  if (response.source !== 'live') redirect(`/staff/supervision?error=${encodeURIComponent(response.error || response.warning || 'unavailable')}`)
  redirect('/staff/supervision?saved=1')
}

export default async function SupervisionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  const result = await getWorkforceSupervision(query.staff_id)
  const supervision = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adults / Staff"
        title="Supervision workflow"
        description="Create, draft, submit, review/sign-off, return and archive reflective supervision, with linked actions and practice evidence."
        action={<Link href="/staff" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Staff dashboard</Link>}
      />
      <LiveDataStatus result={result} />
      {query.saved ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Supervision draft saved.</p> : null}
      {query.error ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">Could not save supervision. Backend status: {query.error}</p> : null}
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <SectionHeader eyebrow="Reflective practice" title="Create supervision" description="Prompts align supervision to competence, wellbeing, leadership oversight and child-centred practice." />
          <form action={createSupervision} className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Staff ID<input name="staff_id" defaultValue={query.staff_id || ''} inputMode="numeric" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Defaults to current user" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Title<input name="title" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Monthly supervision" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Status<select name="status" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="draft">Draft</option><option value="submitted">Submit to manager</option></select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Reflection<textarea name="reflection" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Manager notes<textarea name="notes" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <input name="linked_incident_id" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Incident ID" />
              <input name="linked_training_need_id" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Training need ID" />
              <input name="linked_wellbeing_signal_id" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Wellbeing signal ID" />
              <input name="linked_practice_concern_id" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Practice concern ID" />
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Action from supervision<input name="action_title" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Support, learning or management action" /></label>
            <button type="submit" className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/30">Save supervision</button>
          </form>
        </Card>
        <Card>
          <SectionHeader eyebrow="Prompts" title="Reflective prompts" />
          <div className="space-y-3">
            {supervision.reflective_prompts.map((prompt: string) => (
              <p key={prompt} className="rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-900">{prompt}</p>
            ))}
          </div>
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Workflow" title="Supervision records" description={`Workflow states: ${supervision.workflow.join(', ')}`} />
        <DataTable
          headers={['Record', 'Staff', 'Status', 'Links', 'Actions']}
          rows={supervision.records.map((record: any) => [
            record.title || `Supervision ${record.id}`,
            record.email || record.staff_id || 'Staff not returned',
            <StatusBadge key="status" value={String(record.status || 'recorded')} />,
            `Incidents ${(record.linked_incident_ids || []).length || 0} · Training ${(record.linked_training_need_ids || []).length || 0} · Wellbeing ${(record.linked_wellbeing_signal_ids || []).length || 0}`,
            supervision.actions.filter((action: any) => String(action.supervision_id) === String(record.id)).length
          ])}
          empty={<EmptyState title="No supervision records returned" description="Create a draft or submit a staff journal entry to start the workflow." />}
        />
      </Card>
    </div>
  )
}
