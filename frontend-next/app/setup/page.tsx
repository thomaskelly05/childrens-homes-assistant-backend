import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'

const steps = [
  ['1', 'Organisation / provider details', 'Legal name, responsible individual, registration notes and pilot contact are captured before go-live.', 'Ready'],
  ['2', 'Home details', 'Home name, address, capacity, Ofsted URN and local authority context are reviewed.', 'Ready'],
  ['3', 'Registered manager', 'Manager identity, contact route and MFA expectation are confirmed.', 'Ready'],
  ['4', 'Staff invitations', 'Invite list, roles and home scope are prepared; live invite sending remains admin-gated.', 'Foundation'],
  ['5', 'Roles / permissions', 'Manager, deputy, senior, support worker, RI and viewer permissions are visible for review.', 'Ready'],
  ['6', 'Young people setup', 'Synthetic demo children or real pilot children can be added through the controlled child setup path.', 'Foundation'],
  ['7', 'Documents checklist', 'Care plan, placement plan, risk, education, health, behaviour and review documents are tracked.', 'Ready'],
  ['8', 'Quality standards / SCCIF', 'Evidence areas and readiness gaps are mapped to inspection themes.', 'Ready'],
  ['9', 'Orb / AI privacy', 'Provider-level assistant enablement, private mode and confirmation-before-write are reviewed.', 'Ready'],
  ['10', 'Finish', 'Enter the child selector when setup evidence is complete.', 'Ready']
]

const checklist = [
  'Demo mode uses synthetic data only',
  'Admin users complete MFA setup before pilot use',
  'Document storage and backup location are confirmed',
  'External AI providers remain disabled unless configured by the provider',
  'Live staff invites and role edits need the admin staff endpoint'
]

export default function SetupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Setup"
        title="Home onboarding readiness"
        description="A coherent setup path for provider pilots: configure the organisation, home, staff access, child setup, documents, SCCIF mapping and Orb privacy before entering daily workflows."
        action={<Link href="/young-people" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Enter child selector</Link>}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <SectionHeader eyebrow="Wizard" title="Clickable setup checklist" description="Each step is visible and routable; unavailable live integrations explain the limitation instead of pretending to write data." />
          <div className="grid gap-3">
            {steps.map(([number, title, detail, status]) => (
              <article key={number} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Step {number}</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
                  </div>
                  <StatusBadge value={status} />
                </div>
              </article>
            ))}
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <SectionHeader eyebrow="Exit criteria" title="Pilot gate" />
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionHeader eyebrow="Routes" title="Continue setup" />
            <div className="grid gap-2">
              <Link href="/settings" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Settings</Link>
              <Link href="/staff" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Staff roles</Link>
              <Link href="/documents/regulatory" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Regulatory documents</Link>
              <Link href="/inspection evidence preparation" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Inspection evidence preparation</Link>
              <Link href="/settings/orb" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Orb privacy</Link>
            </div>
          </Card>
        </aside>
      </section>
    </div>
  )
}
