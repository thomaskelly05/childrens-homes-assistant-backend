import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { getChildProfileBundle, text } from '@/lib/os-api/bundles'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '')

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

async function saveLinkedRecord(youngPersonId: string, formData: FormData) {
  'use server'
  const cookieHeader = (await cookies()).toString()
  const type = value(formData, 'record_type') || 'support_plan'
  const title = value(formData, 'title')
  const summary = value(formData, 'summary')
  const detail = value(formData, 'detail')
  const childVoice = value(formData, 'child_voice')
  const reviewDate = value(formData, 'review_date')
  const severity = value(formData, 'severity') || 'medium'
  const endpointMap: Record<string, string> = {
    support_plan: `/young-people/${encodeURIComponent(youngPersonId)}/plans`,
    risk_assessment: `/young-people/${encodeURIComponent(youngPersonId)}/risk`,
    health_profile: `/young-people/${encodeURIComponent(youngPersonId)}/health/profile`,
    medication_profile: `/young-people/${encodeURIComponent(youngPersonId)}/medication-profiles`,
    medication_record: `/young-people/${encodeURIComponent(youngPersonId)}/medication-records`,
    education_profile: `/young-people/${encodeURIComponent(youngPersonId)}/education/profile`,
    family_contact: `/young-people/${encodeURIComponent(youngPersonId)}/family/contacts`
  }
  const method = type === 'health_profile' || type === 'education_profile' ? 'PUT' : 'POST'
  let body: Record<string, unknown>

  if (type === 'support_plan') {
    body = {
      plan_type: value(formData, 'plan_type') || 'support_plan',
      title: title || 'Support plan update',
      presenting_need: summary,
      summary,
      child_voice: childVoice,
      proactive_strategies: detail,
      pace_guidance: value(formData, 'pace_guidance'),
      triggers: value(formData, 'triggers'),
      protective_factors: value(formData, 'protective_factors'),
      review_date: reviewDate || undefined,
      status: 'draft',
      approval_status: 'draft'
    }
  } else if (type === 'risk_assessment') {
    body = {
      category: value(formData, 'category') || 'general',
      title: title || 'Risk assessment',
      concern_summary: summary,
      known_triggers: value(formData, 'triggers'),
      early_warning_signs: value(formData, 'early_warning_signs'),
      contextual_factors: detail,
      current_controls: value(formData, 'current_controls'),
      deescalation_strategies: value(formData, 'deescalation_strategies'),
      response_actions: value(formData, 'actions'),
      child_views: childVoice,
      severity,
      likelihood: value(formData, 'likelihood') || 'medium',
      review_date: reviewDate || undefined,
      status: 'active',
      approval_status: 'not_required'
    }
  } else if (type === 'health_profile') {
    body = {
      gp_name: value(formData, 'gp_name'),
      allergies: value(formData, 'allergies'),
      diagnoses: value(formData, 'diagnoses'),
      mental_health_summary: summary,
      medication_summary: value(formData, 'medication_summary'),
      consent_notes: detail
    }
  } else if (type === 'medication_profile') {
    body = {
      medication_name: title || value(formData, 'medication_name') || 'Medication',
      dosage: value(formData, 'dosage'),
      route: value(formData, 'route'),
      frequency: value(formData, 'frequency'),
      prn_guidance: detail,
      prescribed_by: value(formData, 'professional'),
      start_date: value(formData, 'start_date') || undefined,
      end_date: reviewDate || undefined,
      is_active: !bool(formData, 'inactive'),
      notes: summary
    }
  } else if (type === 'medication_record') {
    body = {
      medication_name: title || value(formData, 'medication_name') || 'Medication',
      dose: value(formData, 'dosage'),
      route: value(formData, 'route'),
      status: value(formData, 'medication_status') || 'administered',
      refusal_reason: value(formData, 'refusal_reason'),
      omission_reason: value(formData, 'omission_reason'),
      error_flag: bool(formData, 'error_flag'),
      error_details: detail
    }
  } else if (type === 'education_profile') {
    body = {
      school_name: title,
      year_group: value(formData, 'year_group'),
      education_status: value(formData, 'education_status') || summary,
      sen_status: value(formData, 'sen_status'),
      ehcp_details: value(formData, 'ehcp_details'),
      designated_teacher: value(formData, 'professional'),
      pep_status: value(formData, 'pep_status'),
      support_summary: detail
    }
  } else {
    body = {
      full_name: title || 'Family contact',
      relationship_to_young_person: value(formData, 'relationship'),
      contact_type: value(formData, 'contact_type') || 'family',
      phone: value(formData, 'phone'),
      email: value(formData, 'email'),
      is_parental_responsibility_holder: bool(formData, 'parental_responsibility'),
      is_approved_contact: bool(formData, 'approved_contact'),
      is_restricted_contact: bool(formData, 'restricted_contact'),
      supervision_level: value(formData, 'supervision_level'),
      notes: `${summary}\n${detail}`.trim()
    }
  }

  const response = await fetch(`${API_BASE}${endpointMap[type]}`, {
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {})
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    redirect(`/young-people/${encodeURIComponent(youngPersonId)}/records/new?error=${response.status}&type=${encodeURIComponent(type)}`)
  }
  redirect(`/young-people/${encodeURIComponent(youngPersonId)}?saved=${encodeURIComponent(type)}`)
}

export default async function NewLinkedRecordPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params
  const query = await searchParams
  const result = await getChildProfileBundle(id)
  const name = text(result.data.identity || {}, ['preferred_name', 'first_name', 'display_name'], `Young person ${id}`)
  const action = saveLinkedRecord.bind(null, id)
  const defaultType = query.type || 'support_plan'

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/young-people/${encodeURIComponent(id)}`} className="text-sm font-black text-blue-700">← Back to {name}</Link>
      <div className="mt-6 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Linked live form</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Create linked record for {name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">This page writes to the live backend routes that now create chronology, evidence, plan links, standards links, manager review and versioning where applicable.</p>
        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">Save failed. Backend status: {query.error}</p> : null}

        <form action={action} className="mt-8 grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Record type<select name="record_type" defaultValue={defaultType} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="support_plan">Support / care plan</option><option value="risk_assessment">Risk assessment</option><option value="health_profile">Health profile</option><option value="medication_profile">Medication profile</option><option value="medication_record">Medication administration</option><option value="education_profile">Education profile</option><option value="family_contact">Family/contact profile</option></select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Severity / significance<select name="severity" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Review date<input name="review_date" type="date" className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">Title / name<input name="title" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Plan title, risk title, school, medication or contact name" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Summary<textarea name="summary" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="What is the main need, concern, update or context?" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Detail / guidance / action<textarea name="detail" rows={5} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Controls, support guidance, PRN guidance, consent detail, contact restrictions, or professional action." /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Child voice<textarea name="child_voice" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Category / plan type<input name="category" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="missing, health, education, behaviour, family" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Likelihood<select name="likelihood" className="rounded-2xl border border-slate-200 px-4 py-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Triggers<textarea name="triggers" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Current controls<textarea name="current_controls" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">De-escalation / support strategies<textarea name="deescalation_strategies" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Actions<textarea name="actions" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" /></label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <input name="gp_name" placeholder="GP / professional" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="allergies" placeholder="Allergies" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="diagnoses" placeholder="Diagnoses / SEN status" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="medication_summary" placeholder="Medication summary" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="dosage" placeholder="Dose" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="route" placeholder="Route" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="frequency" placeholder="Frequency" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="medication_status" placeholder="Medication status e.g. administered/refused" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="refusal_reason" placeholder="Refusal reason" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="school_name" placeholder="School" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="year_group" placeholder="Year group" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="pep_status" placeholder="PEP status" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="relationship" placeholder="Relationship" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="phone" placeholder="Phone" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="email" placeholder="Email" className="rounded-2xl border border-slate-200 px-4 py-3" />
            <input name="supervision_level" placeholder="Contact supervision level" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </div>

          <div className="grid gap-3 rounded-[24px] bg-slate-50 p-5 text-sm font-bold text-slate-700 md:grid-cols-2">
            <label className="flex items-center gap-3"><input type="checkbox" name="error_flag" className="h-4 w-4" /> Medication error / requires manager review</label>
            <label className="flex items-center gap-3"><input type="checkbox" name="restricted_contact" className="h-4 w-4" /> Restricted contact</label>
            <label className="flex items-center gap-3"><input type="checkbox" name="approved_contact" className="h-4 w-4" /> Approved contact</label>
            <label className="flex items-center gap-3"><input type="checkbox" name="parental_responsibility" className="h-4 w-4" /> Parental responsibility holder</label>
          </div>

          <button className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/30" type="submit">Save linked record</button>
        </form>
      </div>
    </main>
  )
}
