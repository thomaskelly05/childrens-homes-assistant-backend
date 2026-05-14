import Link from 'next/link'

import { PageHeader } from '@/components/indicare/ui'

export default function AssistantDocsAppPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assistant app"
        title="IndiCare Docs"
        description="Standalone document drafting is separated from live OS records. It can help with general writing, but it cannot read child, home or staff documents."
        action={<Link href="/documents/templates" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Open OS templates</Link>}
      />
      <section className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600">Boundary</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">No standalone OS document access</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">Use embedded Orb inside a child, home or staff document workspace for scoped evidence and chronology support. Standalone Docs does not retrieve or cite OS documents.</p>
      </section>
    </div>
  )
}
