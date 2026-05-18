import { redirect } from 'next/navigation'
import Link from 'next/link'

import { text } from '@/lib/os-api/bundles'
import { getServerChildProfileBundle } from '@/lib/os-api/server-bundles'
import { osServerPost } from '@/lib/os-api/server-client'

async function createDailyNote(youngPersonId: string, formData: FormData) {
  'use server'
  const noteDate = String(formData.get('note_date') || new Date().toISOString().slice(0, 10))
  const shiftType = String(formData.get('shift_type') || 'day')
  const presentation = String(formData.get('presentation') || '').trim()
  const healthUpdate = String(formData.get('health_update') || '').trim()
  const educationUpdate = String(formData.get('education_update') || '').trim()
  const familyUpdate = String(formData.get('family_update') || '').trim()
  const behaviourUpdate = String(formData.get('behaviour_update') || '').trim()
  const youngPersonVoice = String(formData.get('young_person_voice') || '').trim()
  const positives = String(formData.get('positives') || '').trim()
  const actionsRequired = String(formData.get('actions_required') || '').trim()
  const significance = String(formData.get('significance') || 'medium')
  const managerReviewNeeded = formData.get('manager_review_needed') === 'on'
  const safeguardingConcern = formData.get('safeguarding_concern') === 'on'

  const response = await osServerPost(`/young-people/${encodeURIComponent(youngPersonId)}/daily-notes`, {
      note_date: noteDate,
      shift_type: shiftType,
      status: 'draft',
      workflow_status: 'draft',
      presentation,
      health_update: healthUpdate,
      education_update: educationUpdate,
      family_update: familyUpdate,
      behaviour_update: behaviourUpdate,
      young_person_voice: youngPersonVoice,
      positives,
      actions_required: actionsRequired,
      significance,
      create_follow_up_task: Boolean(actionsRequired),
      link_to_chronology: true,
      link_to_support_plans: true,
      link_monthly_reviews: true,
      link_quality_standards: true,
      manager_review_needed: managerReviewNeeded,
      safeguarding_concern: safeguardingConcern
    }, {})

  if (response.source !== 'live') {
    redirect(`/young-people/${encodeURIComponent(youngPersonId)}/daily-note/new?error=${encodeURIComponent(response.error || response.warning || 'unavailable')}`)
  }

  redirect(`/young-people/${encodeURIComponent(youngPersonId)}?saved=daily-note`)
}

export default async function NewDailyNotePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params
  const query = await searchParams
  const result = await getServerChildProfileBundle(id)
  const bundle = result.data
  const identity = bundle.identity || {}
  const name = text(identity, ['preferred_name', 'first_name', 'display_name'], `Young person ${id}`)
  const createForChild = createDailyNote.bind(null, id)

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href={`/young-people/${encodeURIComponent(id)}`} className="text-sm font-black text-blue-700">← Back to {name}</Link>
      <div className="mt-6 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Live record</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Add daily note for {name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          This saves to the live daily notes endpoint and asks the backend to link the note into chronology, support plans, monthly review evidence, Quality Standards and manager/safeguarding workflow where needed.
        </p>
        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">The daily note could not be saved. Backend status: {query.error}</p> : null}

        <form action={createForChild} className="mt-8 grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Date<input name="note_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Shift<select name="shift_type" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="day">Day</option><option value="late">Late</option><option value="night">Night</option><option value="handover">Handover</option></select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Significance<select name="significance" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">Presentation / summary<textarea name="presentation" required rows={5} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="What happened today? Keep facts, presentation, support and context clear." /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Health / medication / sleep<textarea name="health_update" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Education / activities<textarea name="education_update" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Family / relationships<textarea name="family_update" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Behaviour / risk / de-escalation<textarea name="behaviour_update" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Child voice<textarea name="young_person_voice" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="What did the child say, show or communicate?" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Positives / strengths<textarea name="positives" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Actions required<textarea name="actions_required" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Any follow-up needed? This creates a follow-up task when populated." /></label>

          <div className="grid gap-3 rounded-[24px] bg-slate-50 p-5 text-sm font-bold text-slate-700">
            <label className="flex items-center gap-3"><input type="checkbox" name="manager_review_needed" className="h-4 w-4" /> Manager review needed</label>
            <label className="flex items-center gap-3"><input type="checkbox" name="safeguarding_concern" className="h-4 w-4" /> Safeguarding concern / threshold check</label>
          </div>

          <button className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/30" type="submit">Save live daily note</button>
        </form>
      </div>
    </main>
  )
}
