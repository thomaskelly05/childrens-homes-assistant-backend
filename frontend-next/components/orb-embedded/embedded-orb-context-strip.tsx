import { Lock } from 'lucide-react'

export function EmbeddedOrbContextStrip({ childName, scope = 'active child only' }: { childName?: string; scope?: string }) {
  return (
    <div className="orb-presence-pill flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-[0.14em]">
      <Lock className="h-3.5 w-3.5" aria-hidden />
      {childName ? `Locked to ${childName}` : scope}
    </div>
  )
}

