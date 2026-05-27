export function OrbPresenceIndicator({ label = 'Calm presence', active = true }: { label?: string; active?: boolean }) {
  return (
    <div className="orb-presence-pill inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-[0.16em]">
      <span className={`h-2.5 w-2.5 rounded-full ${active ? 'orb-presence-dot' : 'bg-slate-400'}`} aria-hidden />
      {label}
    </div>
  )
}

