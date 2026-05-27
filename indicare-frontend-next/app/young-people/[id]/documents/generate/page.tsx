import { redirect } from 'next/navigation'
import Link from 'next/link'

import { text } from '@/lib/os-api/bundles'
import { getServerChildProfileBundle } from '@/lib/os-api/server-bundles'
import { osServerPost } from '@/lib/os-api/server-client'

const documentTypes = [
  { id: 'daily-log', label: 'Daily log' },
  { id: 'incident', label: 'Incident report' },
  { id: 'risk', label: 'Risk assessment' },
  { id: 'handover', label: 'Shift handover' },
  { id: 'safeguarding', label: 'Safeguarding record' },
  { id: 'reflection', label: 'Reflective practice' }
]

async function generateDocument(youngPersonId: string, formData: FormData): Promise<void> {
  'use server'
  const type = String(formData.get('document_type') || 'daily-log')
  const description = String(formData.get('description') || '').trim()
  const title = String(formData.get('title') || '').trim()
  const response = await osServerPost(`/documents/${encodeURIComponent(type)}`, {
      description,
      title: title || undefined,
      young_person_id: Number(youngPersonId)
    }, {})
  if (response.source !== 'live') {
    redirect(`/young-people/${encodeURIComponent(youngPersonId)}/documents/generate?error=${encodeURIComponent(response.error || response.warning || 'unavailable')}`)
  }
  redirect(`/young-people/${encodeURIComponent(youngPersonId)}/documents/generate?saved=1&type=${encodeURIComponent(type)}`)
}

export default async function GenerateChildDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params
  const query = await searchParams
  const result = await getServerChildProfileBundle(id)
  const bundle = result.data
  const identity = bundle.identity || {}
  const name = text(identity, ['preferred_name', 'first_name', 'display_name'], `Young person ${id}`)
  const action = generateDocument.bind(null, id)

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href={`/young-people/${encodeURIComponent(id)}`} className="text-sm font-black text-blue-700">← Back to {name}</Link>
      <div className="mt-6 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Generated document</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Generate a linked document for {name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          This sends the child ID to the live document generator. The generated document evidence metadata is linked into the child chronology/evidence trail.
        </p>
        {query.saved ? <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">Document generated and linked. If the browser did not download the file, use the generated evidence trail while the download flow is refined.</p> : null}
        {query.error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">Document generation failed. Backend status: {query.error}</p> : null}
        <form action={action} className="mt-8 grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Document type<select name="document_type" className="rounded-2xl border border-slate-200 px-4 py-3">{documentTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Title<input name="title" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={`${name} document`} /></label>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Context for the document<textarea name="description" required minLength={10} maxLength={8000} rows={10} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Describe the facts, context, action taken and what the document needs to cover." /></label>
          <button className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/30" type="submit">Generate and link document</button>
        </form>
      </div>
    </main>
  )
}
