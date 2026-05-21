import Link from 'next/link'

export default function ChildLifeEchoPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <main className="space-y-6 px-6 py-8 text-slate-950">
      <section className="rounded-[36px] border border-white/70 bg-slate-950 p-8 text-white shadow-[0_24px_90px_rgba(15,23,42,0.16)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">
          Child journey · LifeEcho
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-[-0.06em]">
              LifeEcho workspace
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-8 text-blue-50/72">
              Emotional continuity, reflective playback, relationship mapping and virtual memory preservation for this young person.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/young-people/${params.id}`}
              className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white"
            >
              Open child record
            </Link>

            <Link
              href="/life_echo"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
            >
              Open global LifeEcho
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-black tracking-[-0.04em]">Memory vault</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Preserved achievements, emotional memories, photos, reflections and voice moments.
          </p>
        </article>

        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-black tracking-[-0.04em]">Playback journeys</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Reflective emotional playback built from chronology, atmosphere and continuity.
          </p>
        </article>

        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <h2 className="text-2xl font-black tracking-[-0.04em]">Relationship constellation</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Visual relationship continuity and emotionally important connections.
          </p>
        </article>
      </section>
    </main>
  )
}
