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

const stateStyles: Record<OrbRenderState, { glow: string; gradient: string; motion: string; ring: string; aura: string }> = {
  idle: { glow: 'shadow-[0_0_112px_rgba(34,211,238,0.44)]', gradient: 'from-cyan-100 via-violet-300 to-fuchsia-300', motion: 'orb-motion-breathing', ring: 'bg-cyan-300/20', aura: 'bg-[conic-gradient(from_140deg,rgba(34,211,238,0.12),rgba(168,85,247,0.18),rgba(251,146,60,0.10),rgba(34,211,238,0.12))]' },
  listening: { glow: 'shadow-[0_0_124px_rgba(56,189,248,0.58)]', gradient: 'from-cyan-50 via-sky-300 to-violet-400', motion: 'orb-motion-shimmer', ring: 'bg-cyan-200/25', aura: 'bg-[radial-gradient(circle,rgba(125,211,252,0.22),transparent_64%)]' },
  thinking: { glow: 'shadow-[0_0_118px_rgba(168,85,247,0.48)]', gradient: 'from-violet-100 via-cyan-200 to-fuchsia-300', motion: 'orb-motion-wave', ring: 'bg-violet-300/20', aura: 'bg-[conic-gradient(from_90deg,rgba(168,85,247,0.16),rgba(34,211,238,0.14),rgba(244,114,182,0.16),rgba(168,85,247,0.16))]' },
  speaking: { glow: 'shadow-[0_0_132px_rgba(217,70,239,0.48)]', gradient: 'from-cyan-100 via-fuchsia-300 to-orange-200', motion: 'orb-motion-cadence', ring: 'bg-fuchsia-300/20', aura: 'bg-[radial-gradient(circle,rgba(217,70,239,0.18),transparent_58%)]' },
  interrupted: { glow: 'shadow-[0_0_82px_rgba(125,211,252,0.34)]', gradient: 'from-slate-100 via-cyan-200 to-violet-300', motion: 'orb-motion-soft-ring', ring: 'bg-slate-200/20', aura: 'bg-slate-200/10' },
  reconnecting: { glow: 'shadow-[0_0_82px_rgba(148,163,184,0.34)]', gradient: 'from-slate-200 via-cyan-200 to-slate-300', motion: 'orb-motion-soft-ring', ring: 'bg-slate-300/20', aura: 'bg-[linear-gradient(120deg,transparent,rgba(148,163,184,0.22),transparent)]' },
  offline: { glow: 'shadow-[0_0_48px_rgba(148,163,184,0.24)]', gradient: 'from-slate-400 via-slate-300 to-slate-500', motion: '', ring: 'bg-slate-400/10', aura: 'bg-slate-500/10' },
  permission_denied: { glow: 'shadow-[0_0_72px_rgba(251,191,36,0.32)]', gradient: 'from-amber-100 via-slate-100 to-orange-200', motion: '', ring: 'bg-amber-300/15', aura: 'bg-amber-300/10' },
  private_mode: { glow: 'shadow-[0_0_58px_rgba(148,163,184,0.28)]', gradient: 'from-slate-100 via-white to-slate-300', motion: '', ring: 'bg-slate-200/15', aura: 'bg-white/10' },
  safeguarding_cautious: { glow: 'shadow-[0_0_94px_rgba(251,146,60,0.40)]', gradient: 'from-amber-100 via-cyan-100 to-violet-300', motion: 'orb-motion-soft-ring', ring: 'bg-amber-300/20', aura: 'bg-[radial-gradient(circle,rgba(251,146,60,0.16),transparent_60%)]' },
  child_present: { glow: 'shadow-[0_0_84px_rgba(34,211,238,0.30)]', gradient: 'from-cyan-100 via-slate-100 to-violet-200', motion: 'orb-motion-breathing', ring: 'bg-cyan-200/14', aura: 'bg-cyan-200/10' },
  emotional_safety: { glow: 'shadow-[0_0_78px_rgba(125,211,252,0.30)]', gradient: 'from-sky-100 via-violet-100 to-fuchsia-100', motion: 'orb-motion-breathing', ring: 'bg-sky-200/14', aura: 'bg-sky-200/10' },
  reduced_motion: { glow: 'shadow-[0_0_62px_rgba(34,211,238,0.30)]', gradient: 'from-cyan-200 via-violet-200 to-fuchsia-200', motion: '', ring: 'bg-cyan-200/12', aura: 'bg-cyan-200/8' }
}

export function OrbSphere({ state = 'idle', size = 'large' }: { state?: OrbRenderState; size?: 'small' | 'medium' | 'large' | 'xlarge' }) {
  const styles = stateStyles[state]
  const sizeClass = size === 'small' ? 'h-14 w-14' : size === 'medium' ? 'h-28 w-28' : size === 'xlarge' ? 'h-64 w-64 md:h-80 md:w-80' : 'h-44 w-44'

  return (
    <div className={`relative inline-flex ${sizeClass} items-center justify-center`} role="img" aria-label={`ORB ${state.replaceAll('_', ' ')}`}>
      <span className={`absolute inset-[-42%] rounded-full blur-3xl ${styles.aura} motion-reduce:animate-none ${styles.motion}`} aria-hidden />
      <span className={`absolute inset-[-18%] rounded-full blur-3xl ${styles.ring} motion-reduce:animate-none ${styles.motion}`} aria-hidden />
      <span className="absolute inset-[-7%] rounded-full border border-white/30 bg-white/5" aria-hidden />
      <span className={`relative block ${sizeClass} overflow-hidden rounded-full border border-white/50 bg-gradient-to-br ${styles.gradient} ${styles.glow} ${styles.motion} transition-[filter,opacity,transform] duration-700 motion-reduce:animate-none`} aria-hidden>
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_28%,rgba(255,255,255,0.68),transparent_20%),radial-gradient(circle_at_68%_72%,rgba(34,211,238,0.26),transparent_28%)]" />
        <span className="absolute inset-2 rounded-full bg-white/20 blur-md" />
        <span className="absolute -left-8 top-4 h-2/3 w-1/2 rotate-12 rounded-full bg-white/35 blur-xl" />
        <span className="absolute bottom-4 right-4 h-1/3 w-1/3 rounded-full bg-orange-100/35 blur-xl" />
        <span className="absolute inset-x-8 bottom-8 h-8 rounded-full bg-cyan-100/25 blur-2xl" />
      </span>
    </div>
  )
}

