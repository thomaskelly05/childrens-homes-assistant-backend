import { Bell, BookOpen, ClipboardPenLine, HeartPulse, Home, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react'

const chronology = [
  {
    type: 'Daily record',
    title: 'Evening support and emotional regulation',
    body: 'Young person engaged positively with staff, accepted emotional reassurance and completed agreed evening routine. No escalation indicators identified during the shift.',
    tags: ['Positive engagement', 'Routine', 'Emotional stability']
  },
  {
    type: 'Direct work',
    title: 'Reflective conversation around education',
    body: 'Staff explored attendance barriers and agreed a structured support approach for tomorrow morning transition.',
    tags: ['Education', 'Child voice', 'Planning']
  }
]

const metrics = [
  ['277', 'Live chronology items'],
  ['275', 'Reviews pending'],
  ['94%', 'Chronology continuity']
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white shadow-lg shadow-blue-500/30">
              IC
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight">IndiCare OS</h1>
              <p className="text-xs text-slate-500">Children&apos;s home workspace</p>
            </div>
          </div>

          <nav className="flex-1 space-y-8 overflow-auto px-4 py-6">
            <div>
              <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Care
              </p>

              <div className="space-y-1">
                {[
                  ['Today', Home],
                  ['Young Person', BookOpen],
                  ['Journey', ClipboardPenLine],
                  ['Timeline', Sparkles]
                ].map(([label, Icon], index) => (
                  <button
                    key={label}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                      index === 0
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Recording
              </p>

              <div className="space-y-1">
                {[
                  ['Daily Recording', ClipboardPenLine],
                  ['Health & Medication', HeartPulse],
                  ['Incidents & Safeguarding', ShieldAlert],
                  ['Family & Contact', MessageSquare]
                ].map(([label, Icon]) => (
                  <button
                    key={label}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-slate-200 bg-[#08142d] px-8 py-4 text-white shadow-2xl shadow-slate-900/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                  <span>Home 1</span>
                  <span>/</span>
                  <span>Young person 1</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                  Assistant
                </button>
                <button className="rounded-2xl bg-white px-5 py-2 text-sm font-black text-slate-900 shadow-lg shadow-blue-950/20 transition hover:translate-y-[-1px]">
                  + Record
                </button>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-auto px-8 py-8">
              <div className="mx-auto max-w-6xl space-y-6">
                <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Children&apos;s home OS
                  </p>
                  <h2 className="mt-3 text-5xl font-black tracking-[-0.06em] text-slate-950">
                    Today
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
                    Live chronology and operational recording for the current young person.
                  </p>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  {metrics.map(([value, label]) => (
                    <article
                      key={label}
                      className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]"
                    >
                      <strong className="block text-4xl font-black tracking-[-0.06em] text-slate-950">
                        {value}
                      </strong>
                      <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {label}
                      </span>
                    </article>
                  ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-[32px] border border-white/70 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                          Live shift
                        </p>
                        <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                          Chronology
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">
                          + Record
                        </button>
                        <button className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                          Handover
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {chronology.map((entry) => (
                        <article
                          key={entry.title}
                          className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-7 transition hover:-translate-y-[1px] hover:shadow-xl hover:shadow-slate-200/50"
                        >
                          <div className="mb-5 flex items-center gap-3">
                            <span className="rounded-full bg-blue-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                              {entry.type}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              Recorded 20:00
                            </span>
                          </div>

                          <h4 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                            {entry.title}
                          </h4>

                          <p className="mt-4 text-[15px] leading-8 text-slate-600">
                            {entry.body}
                          </p>

                          <div className="mt-6 flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Shift context
                      </p>

                      <div className="mt-5 rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6">
                        <strong className="block text-3xl font-black tracking-[-0.05em] text-emerald-700">
                          Stable
                        </strong>
                        <span className="mt-2 block text-sm leading-6 text-slate-600">
                          Emotional presentation settled. Low escalation indicators.
                        </span>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Assistant
                      </p>

                      <div className="mt-5 space-y-3">
                        {[
                          'Summarise chronology',
                          'Prepare handover',
                          'Review safeguarding risks'
                        ].map((action) => (
                          <button
                            key={action}
                            className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            {action}
                            <Bell className="h-4 w-4 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </section>
                  </aside>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
