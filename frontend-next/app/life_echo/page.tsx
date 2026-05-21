import Link from 'next/link'

export default function LifeEchoPage() {
  return (
    <main className="min-h-[calc(100vh-120px)] px-6 py-10 text-slate-950">
      <section className="relative overflow-hidden rounded-[40px] border border-white/70 bg-slate-950 p-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.18)] md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.28),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(250,204,21,0.18),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.22),transparent_36%)]" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">
              LifeEcho virtual memory box
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-[-0.08em] text-white md:text-7xl">
              Emotional continuity for young people.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-blue-50/78 md:text-lg">
              LifeEcho brings memories, emotional atmosphere, relationships, voice moments and therapeutic reflection into one protected child-centred space.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/young-people" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-blue-950/20">
                Choose child
              </Link>
              <Link href="/api/life-echo/manifest" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">
                View API manifest
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[420px] rounded-full border border-white/10 bg-white/5 shadow-[0_0_120px_rgba(56,189,248,0.22)]">
            <div className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.78),transparent_18%),radial-gradient(circle_at_center,rgba(56,189,248,0.52),rgba(168,85,247,0.23)_48%,rgba(250,204,21,0.18)_68%,transparent_75%)]" />
          </div>
        </div>
      </section>
    </main>
  )
}
