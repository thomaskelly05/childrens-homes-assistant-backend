export default function LifeEchoHomePage() {
  return (
    <main className="min-h-screen bg-[#070b14] text-white overflow-hidden">
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(123,199,255,0.25),transparent_35%),radial-gradient(circle_at_bottom,rgba(248,215,122,0.15),transparent_35%)]" />

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)]" />
            LifeEcho Virtual Memory Box
          </div>

          <h1 className="mx-auto max-w-5xl text-6xl font-semibold leading-none tracking-[-0.08em] md:text-8xl">
            Emotional continuity for human lives.
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/70 md:text-2xl">
            LifeEcho transforms emotional memories, relationships, achievements and therapeutic reflection into a living virtual memory experience.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-medium backdrop-blur-xl transition hover:bg-white/15"
              href="/life_echo"
            >
              Open LifeEcho
            </a>

            <a
              className="rounded-2xl border border-white/10 px-6 py-4 font-medium text-white/70 transition hover:bg-white/5"
              href="/api/life-echo/manifest"
            >
              View Platform Manifest
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
