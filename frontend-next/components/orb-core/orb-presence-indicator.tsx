export function OrbPresenceIndicator({ label = 'Calm presence', active = true }: { label?: string; active?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.8)]' : 'bg-slate-400'}`} aria-hidden />
      {label}
    </div>
  )
}

