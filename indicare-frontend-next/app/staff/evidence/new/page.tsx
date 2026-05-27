import { redirect } from 'next/navigation'
import Link from 'next/link'

import { osServerPost } from '@/lib/os-api/server-client'

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

async function saveStaffEvidence(formData: FormData) {
  'use server'
  const response = await osServerPost('/staff/evidence', {
      staff_id: value(formData, 'staff_id') ? Number(value(formData, 'staff_id')) : undefined,
      evidence_type: value(formData, 'evidence_type') || 'supervision',
      title: value(formData, 'title'),
      summary: value(formData, 'summary'),
      notes: value(formData, 'notes'),
      outcome: value(formData, 'outcome'),
      training_name: value(formData, 'training_name'),
      competency_area: value(formData, 'competency_area'),
      review_note: value(formData, 'review_note'),
      review_date: value(formData, 'review_date') || undefined,
      status: value(formData, 'status') || 'recorded'
    }, {})
  if (response.source !== 'live') redirect(`/staff/evidence/new?error=${encodeURIComponent(response.error || response.warning || 'unavailable')}`)
  redirect('/staff/evidence/new?saved=1')
}

export default async function NewStaffEvidencePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/staff/evidence" className="text-sm font-black text-blue-700">← Back to staff evidence</Link>
      <div className="mt-6 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Workforce evidence</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Create staff evidence</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">This writes to the live staff evidence endpoint and links supervision, training, probation or staff-profile evidence into Reg 13 leadership and management where supported.</p>
        {query.saved ? <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Staff evidence saved and sent to workforce linking.</p> : null}
        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">Could not save staff evidence. Backend status: {query.error}</p> : null}
        <form action={saveStaffEvidence} className="mt-8 grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Staff ID<input name="staff_id" inputMode="numeric" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Optional; defaults to current user" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Evidence type<select name="evidence_type" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="supervision">Supervision</option><option value="training">Training / competency</option><option value="probation">Probation review</option><option value="profile">Staff profile</option></select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Status<input name="status" defaultValue="recorded" className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Title<input name="title" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Supervision, training or review title" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Summary<textarea name="summary" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Notes / reflection<textarea name="notes" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Outcome<textarea name="outcome" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Training name<input name="training_name" className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Competency area<input name="competency_area" className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Review note<textarea name="review_note" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Review date<input name="review_date" type="date" className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
          </div>
          <button className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/30" type="submit">Save workforce evidence</button>
        </form>
      </div>
    </main>
  )
}
