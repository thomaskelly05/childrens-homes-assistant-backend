'use client'

import Link from 'next/link'

const PRIMARY_WORKFLOWS = [
  {
    title: 'Ask ORB',
    desc: 'Talk through practice questions, uncertainty and next-step thinking.',
    href: '/orb/ask',
    accent: 'from-sky-50 to-white',
  },
  {
    title: 'Shift Builder',
    desc: 'Turn rough shift notes into structured, child-centred outputs.',
    href: '/orb?station=shift_builder',
    accent: 'from-violet-50 to-white',
  },
  {
    title: 'Record This Properly',
    desc: 'Shape factual, professional and non-punitive recording.',
    href: '/orb/ask?mode=recording',
    accent: 'from-emerald-50 to-white',
  },
]

const SUPPORT_WORKFLOWS = [
  'Safeguarding Thinking',
  'Therapeutic Reframe',
  'Ofsted Lens',
  'Supervision Prep',
]

export function OrbResidentialHome() {
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#312E81] p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="absolute right-[-4rem] top-[-4rem] h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-5rem] h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
            ORB Residential · Powered by IndiCare Intelligence
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            The calm intelligence beside you on shift.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Support for recording, safeguarding thinking, therapeutic reflection and shift pressure — without accessing
            IndiCare OS records, chronology or dashboards.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/orb/ask"
              className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-[#111827] shadow-lg shadow-black/20 transition hover:scale-[1.01]"
            >
              Ask ORB
            </Link>
            <Link
              href="/orb/shift-builder"
              className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              Build a shift pack
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PRIMARY_WORKFLOWS.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={`group rounded-3xl border border-white/70 bg-gradient-to-br ${item.accent} p-5 shadow-sm shadow-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl`}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-lg text-white shadow-lg shadow-slate-300/70">
              ✦
            </div>
            <h2 className="text-base font-semibold text-[#111827]">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">{item.desc}</p>
            <p className="mt-4 text-sm font-medium text-[#111827] opacity-70 group-hover:opacity-100">Open →</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">What ORB helps with</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {SUPPORT_WORKFLOWS.map((item) => (
              <div key={item} className="rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#374151]">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Standalone by design</h2>
          <p className="mt-3 text-sm leading-6 text-[#4B5563]">
            ORB uses shared residential intelligence, but it does not read live records, dashboards, chronology or provider
            systems. You stay in control of what you share.
          </p>
          <div className="mt-4 flex gap-2 text-xs text-[#6B7280]">
            <Link className="rounded-full bg-[#F3F4F6] px-3 py-2 hover:bg-[#E5E7EB]" href="/orb/access">
              Premium access
            </Link>
            <Link className="rounded-full bg-[#F3F4F6] px-3 py-2 hover:bg-[#E5E7EB]" href="/orb/onboarding">
              Personalise ORB
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
