export function WorkspaceHeader() {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
            Children&apos;s home OS
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-slate-950">
            Today
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
            Live chronology and operational recording for the current young person.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 px-5 py-4">
            <strong className="block text-lg font-black tracking-[-0.04em] text-emerald-700">
              Stable
            </strong>
            <span className="block text-xs font-bold text-slate-500">
              Placement state
            </span>
          </div>

          <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">
            + Record
          </button>
        </div>
      </div>
    </section>
  )
}
