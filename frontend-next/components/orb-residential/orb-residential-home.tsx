'use client'

const WORKFLOWS = [
  { title: 'Ask ORB', desc: 'Residential intelligence for practice questions.' },
  { title: 'Shift Builder', desc: 'Turn rough notes into structured shift outputs.' },
  { title: 'Record This Properly', desc: 'Factual, child-centred recording support.' },
  { title: 'Safeguarding Thinking', desc: 'Facts, concerns, gaps — not threshold decisions.' },
  { title: 'Therapeutic Reframe', desc: 'Trauma-informed reflection without diagnosis.' },
  { title: 'Ofsted Lens', desc: 'Evidence thinking — not outcome prediction.' },
]

export function OrbResidentialHome() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Calm support for residential care</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">
          ORB Residential is a standalone premium app. It uses shared IndiCare Intelligence — not IndiCare OS
          records, chronology or dashboards.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {WORKFLOWS.map((item) => (
          <li key={item.title} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <h2 className="font-medium">{item.title}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">{item.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
