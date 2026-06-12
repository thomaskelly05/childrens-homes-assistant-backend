import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Canonical primary action labels across ORB Residential surfaces. */
export const ORB_PREMIUM_ACTION_LABELS = {
  analyseWithOrb: 'Review with ORB',
  generateDraft: 'Create draft record',
  openInOrbWrite: 'Open in ORB Write',
  continueInChat: 'Continue in chat',
  exportPdf: 'Export PDF',
  saveDraft: 'Save draft',
  startInDictate: 'Start in Dictate',
  useWithDocument: 'Use with Document',
  generateShiftPlan: 'Create draft record',
  runQualityReview: 'Create draft record',
  copy: 'Copy',
  exportMarkdown: 'Export',
  previewStructure: 'Preview structure',
  useTemplate: 'Use template',
  addDocumentOrLink: 'Add document or link'
} as const

export type OrbPremiumButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

export const orbPremiumRadii = {
  card: 'rounded-2xl',
  panel: 'rounded-2xl',
  control: 'rounded-xl',
  pill: 'rounded-full'
} as const

export const orbPremiumButtonVariants: Record<OrbPremiumButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-[#168bff] to-[#0d5fcc] text-white shadow-[0_8px_24px_rgba(22,139,255,0.22)] hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-sky-400/50 disabled:opacity-45 disabled:shadow-none disabled:cursor-not-allowed',
  secondary:
    'border border-[var(--orb-line)]/70 bg-[var(--orb-surface-elevated)]/90 text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)] focus-visible:ring-2 focus-visible:ring-sky-400/30 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:ring-2 focus-visible:ring-sky-400/25 disabled:opacity-50 disabled:cursor-not-allowed',
  destructive:
    'border border-red-400/25 bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/15 focus-visible:ring-2 focus-visible:ring-red-400/30 disabled:opacity-50 disabled:cursor-not-allowed'
}

export const orbPremiumCardClass =
  'orb-premium-card orb-doc-glass-card rounded-2xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 backdrop-blur-sm'

export const orbPremiumPanelClass =
  'orb-premium-panel min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 p-3 sm:p-4'

export const orbPremiumInputClass =
  'orb-premium-input w-full rounded-xl border border-[var(--orb-line)]/70 bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)] outline-none focus-visible:border-[var(--orb-primary,#168bff)]/40 focus-visible:ring-2 focus-visible:ring-sky-400/20'

export const orbPremiumTextareaClass =
  'orb-premium-textarea w-full rounded-xl border border-[var(--orb-line)]/70 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)] outline-none focus-visible:border-[var(--orb-primary,#168bff)]/40 focus-visible:ring-2 focus-visible:ring-sky-400/20'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function orbPremiumButtonClass(variant: OrbPremiumButtonVariant, extra?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
    orbPremiumButtonVariants[variant],
    extra
  )
}
