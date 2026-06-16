import Link from 'next/link'

const cards = [
  ['Review This', 'Paste an incident, care plan, risk assessment or chronology and let ORB review it through child voice, safeguarding, impact and Ofsted lenses.'],
  ['Templates', 'Create residential childcare templates for safeguarding, recording, care planning, leadership, locality risk and learning.'],
  ['Learn', 'Turn guidance into short staff learning, reflective prompts, CPD notes and knowledge checks.'],
  ['Saved Outputs', 'Keep useful reviews, templates, learning sessions and locality assessments in one place.']
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-slate-950">
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.22),transparent_34%),radial-gradient(circle_at_18%_80%,rgba(79,70,229,0.14),transparent_32%)]" />

        <header className="relative z-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="ORB Residential home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-xl shadow-slate-300">O</span>
            <span>
              <span className="block text-[0.7rem] font-black uppercase tracking-[0.38em] text-sky-700">ORB Residential</span>
              <span className="block text-sm font-bold text-slate-600">Powered by IndiCare Intelligence</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/os" className="hidden rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm sm:inline-flex">IndiCare OS</Link>
            <Link href="/orb/login" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">Sign in</Link>
          </div>
        </header>

        <div className="relative z-10 grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
          <section>
            <p className="mb-4 inline-flex rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-sky-700 shadow-sm">Professional copilot for children&apos;s homes</p>
            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.08em] text-slate-950 sm:text-6xl lg:text-7xl">
              The first place adults go when they need help thinking, writing or preparing.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              ORB Residential helps adults write better records, strengthen safeguarding, create templates, review incidents and support inspection evidence preparation — without becoming another care management system.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:max-w-md">
              <Link href="/orb/setup" className="rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-black text-white shadow-2xl shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800">
                Start Free Trial
              </Link>
              <Link href="/orb/login" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
                Sign in to ORB
              </Link>
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-500">Simple sign-in, guided setup, then ORB opens with Ask ORB, Review This, Templates, Learn and Saved Outputs.</p>
          </section>

          <section className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-2xl shadow-slate-200 backdrop-blur">
            <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white shadow-inner">
              <p className="text-xs font-black uppercase tracking-[0.34em] text-sky-300">Ask ORB</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">What can I help you with today?</h2>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">
                Review this missing-from-care incident and tell me what a manager, RI and Ofsted would want to understand.
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {cards.map(([title, detail]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/8 p-4">
                    <h3 className="font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}