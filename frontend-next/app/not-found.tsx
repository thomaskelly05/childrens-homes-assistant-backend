import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-6">
      <section className="w-full max-w-2xl rounded-[32px] border border-white/70 bg-white p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Navigation recovery
        </p>

        <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">
          Workspace not found
        </h1>

        <p className="mt-6 max-w-xl text-base leading-8 text-slate-500">
          The requested operational workspace could not be located. Return to the chronology workspace to continue operational recording.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/"
            className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/20"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  )
}
