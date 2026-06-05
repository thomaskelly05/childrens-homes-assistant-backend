import { cn, orbPremiumRadii } from '@/components/orb/premium/orb-premium-theme'

/** Studio layout class tokens — builds on OrbPremium v2. */
export const orbStudioShellClass =
  'orb-studio-shell relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl'

export const orbStudioHeroClass =
  'orb-studio-hero relative overflow-hidden rounded-2xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/60 bg-gradient-to-br from-white/90 via-[#f8fbff]/95 to-[#eef4fc]/90 px-5 py-6 shadow-[var(--orb-v2-shadow-md,0_8px_28px_rgba(15,23,42,0.07))] backdrop-blur-md sm:px-6 sm:py-7'

export const orbStudioPanelClass =
  'orb-studio-panel flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/55 bg-[var(--orb-v2-glass-elevated,rgba(255,255,255,0.94))] shadow-[var(--orb-v2-shadow-sm,0_2px_8px_rgba(15,23,42,0.04))] backdrop-blur-md'

export const orbStudioSidebarPanelClass =
  'orb-studio-sidebar-panel flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/50 bg-[var(--orb-v2-glass-surface,rgba(255,255,255,0.82))] shadow-[var(--orb-v2-shadow-sm)] backdrop-blur-sm lg:w-[280px] xl:w-[300px]'

export const orbStudioActionRailClass =
  'orb-studio-action-rail flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/45 bg-[var(--orb-v2-glass-surface,rgba(255,255,255,0.82))] px-3 py-2 shadow-[var(--orb-v2-shadow-sm)] backdrop-blur-sm'

export const orbStudioDocumentSurfaceClass =
  'orb-studio-document-surface relative mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[20mm] py-[18mm] text-[#0f172a] shadow-[0_4px_32px_rgba(15,23,42,0.14)]'

export const orbStudioComposerCardClass =
  'orb-studio-composer-card rounded-2xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/50 bg-[var(--orb-v2-glass-elevated,rgba(255,255,255,0.94))] p-4 shadow-[var(--orb-v2-shadow-sm)] backdrop-blur-sm sm:p-5'

export const orbStudioMetricCardClass =
  'orb-studio-metric-card rounded-xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/40 bg-gradient-to-br from-white/95 to-[#f3f8ff]/90 px-3 py-2.5 shadow-[var(--orb-v2-shadow-sm)]'

export const orbStudioSourceCardClass =
  'orb-studio-source-card group rounded-xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/45 bg-[var(--orb-v2-glass-surface,rgba(255,255,255,0.82))] p-3 transition hover:border-[var(--orb-v2-glass-border-strong,rgba(22,119,255,0.22))] hover:shadow-[var(--orb-v2-shadow-sm)]'

export const orbStudioPrimaryActionClass =
  'orb-studio-primary-action inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,139,255,0.22)] transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none'

export function orbStudioClass(...inputs: Parameters<typeof cn>) {
  return cn(...inputs)
}

export { orbPremiumRadii }
