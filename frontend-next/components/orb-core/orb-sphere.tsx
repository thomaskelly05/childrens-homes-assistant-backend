'use client'

export type OrbRenderState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'offline'
  | 'permission_denied'
  | 'private_mode'
  | 'safeguarding_cautious'
  | 'child_present'
  | 'emotional_safety'
  | 'reduced_motion'

const stateStyles: Record<OrbRenderState, { glow: string; gradient: string; motion: string; ring: string }> = {
  idle: { glow: 'shadow-[0_0_86px_rgba(34,211,238,0.40)]', gradient: 'from-cyan-200 via-violet-300 to-fuchsia-300', motion: 'orb-motion-breathing', ring: 'bg-cyan-300/20' },
  listening: { glow: 'shadow-[0_0_96px_rgba(56,189,248,0.55)]', gradient: 'from-cyan-100 via-sky-300 to-violet-400', motion: 'orb-motion-shimmer', ring: 'bg-cyan-200/25' },
  thinking: { glow: 'shadow-[0_0_92px_rgba(168,85,247,0.45)]', gradient: 'from-violet-200 via-cyan-200 to-magenta-300', motion: 'orb-motion-wave', ring: 'bg-violet-300/20' },
  speaking: { glow: 'shadow-[0_0_104px_rgba(217,70,239,0.44)]', gradient: 'from-cyan-200 via-fuchsia-300 to-orange-200', motion: 'orb-motion-cadence', ring: 'bg-fuchsia-300/20' },
  interrupted: { glow: 'shadow-[0_0_72px_rgba(125,211,252,0.32)]', gradient: 'from-slate-100 via-cyan-200 to-violet-300', motion: 'orb-motion-soft-ring', ring: 'bg-slate-200/20' },
  reconnecting: { glow: 'shadow-[0_0_68px_rgba(148,163,184,0.30)]', gradient: 'from-slate-200 via-cyan-200 to-slate-300', motion: 'orb-motion-soft-ring', ring: 'bg-slate-300/20' },
  offline: { glow: 'shadow-[0_0_42px_rgba(148,163,184,0.24)]', gradient: 'from-slate-400 via-slate-300 to-slate-500', motion: '', ring: 'bg-slate-400/10' },
  permission_denied: { glow: 'shadow-[0_0_62px_rgba(251,191,36,0.30)]', gradient: 'from-amber-100 via-slate-100 to-orange-200', motion: '', ring: 'bg-amber-300/15' },
  private_mode: { glow: 'shadow-[0_0_52px_rgba(148,163,184,0.26)]', gradient: 'from-slate-100 via-white to-slate-300', motion: '', ring: 'bg-slate-200/15' },
  safeguarding_cautious: { glow: 'shadow-[0_0_84px_rgba(251,146,60,0.36)]', gradient: 'from-amber-100 via-cyan-100 to-violet-300', motion: 'orb-motion-soft-ring', ring: 'bg-amber-300/20' },
  child_present: { glow: 'shadow-[0_0_74px_rgba(34,211,238,0.28)]', gradient: 'from-cyan-100 via-slate-100 to-violet-200', motion: 'orb-motion-breathing', ring: 'bg-cyan-200/14' },
  emotional_safety: { glow: 'shadow-[0_0_64px_rgba(125,211,252,0.26)]', gradient: 'from-sky-100 via-violet-100 to-fuchsia-100', motion: 'orb-motion-breathing', ring: 'bg-sky-200/14' },
  reduced_motion: { glow: 'shadow-[0_0_54px_rgba(34,211,238,0.30)]', gradient: 'from-cyan-200 via-violet-200 to-fuchsia-200', motion: '', ring: 'bg-cyan-200/12' }
}

export function OrbSphere({ state = 'idle', size = 'large' }: { state?: OrbRenderState; size?: 'small' | 'medium' | 'large' }) {
  const styles = stateStyles[state]
  const sizeClass = size === 'small' ? 'h-14 w-14' : size === 'medium' ? 'h-28 w-28' : 'h-44 w-44'

  return (
    <div className={`relative inline-flex ${sizeClass} items-center justify-center`} role="img" aria-label={`ORB ${state.replaceAll('_', ' ')}`}>
      <span className={`absolute inset-[-18%] rounded-full blur-3xl ${styles.ring} motion-reduce:animate-none ${styles.motion}`} aria-hidden />
      <span className="absolute inset-[-7%] rounded-full border border-white/30 bg-white/5" aria-hidden />
      <span className={`relative block ${sizeClass} overflow-hidden rounded-full border border-white/50 bg-gradient-to-br ${styles.gradient} ${styles.glow} ${styles.motion} transition-[filter,opacity,transform] duration-700 motion-reduce:animate-none`} aria-hidden>
        <span className="absolute inset-2 rounded-full bg-white/20 blur-md" />
        <span className="absolute -left-8 top-4 h-2/3 w-1/2 rotate-12 rounded-full bg-white/35 blur-xl" />
        <span className="absolute bottom-4 right-4 h-1/3 w-1/3 rounded-full bg-orange-100/35 blur-xl" />
        <span className="absolute inset-x-8 bottom-8 h-8 rounded-full bg-cyan-100/25 blur-2xl" />
      </span>
    </div>
  )
}

