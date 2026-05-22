export default function OrbStandalonePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.28),transparent_28rem),radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.18),transparent_30rem),linear-gradient(135deg,#030611,#07101f_44%,#090617)]" />
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:64px_64px]" />

      <section className="relative grid min-h-screen gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="rounded-[30px] border border-white/10 bg-slate-950/65 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div>
            <p className="text-lg font-black tracking-[0.32em]">ORB</p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Care Companion</p>
          </div>

          <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-sm leading-6 text-slate-300">
            Standalone ChatGPT-style assistant for residential children’s homes. General AI capability with an Ofsted-grade practice lens.
          </div>

          <nav className="mt-7 grid gap-2" aria-label="ORB standalone modes">
            {['Ask ORB', 'Safeguarding', 'Reflect', 'Ofsted Lens', 'Behaviour Support', 'Record This Properly'].map((mode, index) => (
              <button
                key={mode}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  index === 0
                    ? 'border-cyan-300/60 bg-cyan-300/15 text-white shadow-lg shadow-cyan-500/10'
                    : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40 hover:bg-white/[0.075]'
                }`}
                type="button"
              >
                {mode}
              </button>
            ))}
          </nav>

          <p className="mt-8 text-xs leading-5 text-slate-500">
            Standalone only. No CareHub records, chronology, dashboards, staff records or young person records are accessed here.
          </p>
        </aside>

        <section className="grid min-h-[70vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/65 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <header className="border-b border-white/10 px-7 py-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Standalone ORB</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] md:text-6xl">How can I help?</h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
              Ask anything, like ChatGPT. When it touches children’s homes, ORB thinks through safety, lived experience, progress, leadership impact, evidence, Ofsted expectations and the quality standards.
            </p>
          </header>

          <div className="space-y-4 overflow-auto px-7 py-6">
            <article className="max-w-3xl rounded-3xl border border-white/10 bg-white/[0.055] p-5 leading-7 text-slate-200">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">ORB</p>
              I’m your standalone care companion. I can draft, explain, plan, summarise, reflect and help you think like an outstanding children’s homes practitioner and Ofsted inspector.
            </article>
          </div>

          <form className="m-5 grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="min-h-14 bg-transparent px-2 text-base font-semibold text-white outline-none placeholder:text-slate-500"
              placeholder="Ask ORB anything..."
              readOnly
            />
            <a
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#f0abfc,#fbbf24)] px-6 text-sm font-black text-slate-950"
              href="/orb?standalone=1"
            >
              Start
            </a>
          </form>
        </section>

        <aside className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/65 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="mx-auto aspect-square w-56 rounded-full bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,.95),transparent_12%),radial-gradient(circle_at_30%_28%,#67e8f9,transparent_25%),radial-gradient(circle_at_78%_66%,#fbbf24,transparent_28%),linear-gradient(135deg,#2563eb,#8b5cf6,#f97316)] shadow-[0_0_90px_rgba(103,232,249,.45),0_0_140px_rgba(249,115,22,.28),inset_0_0_46px_rgba(255,255,255,.3)] animate-pulse" />
              <p className="mt-12 text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Hue intelligence</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">Floating ORB presence</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Calm, visual and specialist. Blue for listening, amber for response, purple for reflection, red for urgent safeguarding thinking.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
