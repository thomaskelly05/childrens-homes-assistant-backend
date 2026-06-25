'use client'

import { Eye, EyeOff, Shield } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { getShadowReviewConfigSnapshot } from '@/lib/indicare-lab/review-events/review-event-config'

function StatusPill({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
        : tone === 'danger'
          ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
          : 'border-white/10 bg-white/[0.04] text-slate-300'

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  )
}

export function ShadowReviewStatusCard() {
  const config = getShadowReviewConfigSnapshot()

  return (
    <LabSectionCard
      id="shadow-review"
      eyebrow="Phase 3"
      title="Shadow review mode"
      description="ORB outputs can generate internal review events for founder review without blocking or rewriting live answers."
      action={
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {config.enabled ? (
            <Eye className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          )}
          <span>Founder-only · not shown to ORB users</span>
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/90">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
        <p>
          Reviews, flags, and recommendations support founder review only — not expert validation or
          compliance guarantees. Live blocking and rewriting are off in this phase.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatusPill
          label="Shadow review"
          value={config.enabled ? 'Enabled' : 'Disabled'}
          tone={config.enabled ? 'success' : 'neutral'}
        />
        <StatusPill
          label="Mode"
          value={config.developmentMode ? 'Development' : 'Shadow only'}
          tone="neutral"
        />
        <StatusPill label="Live blocking" value="Off" tone="success" />
        <StatusPill label="Live rewriting" value="Off" tone="success" />
        <StatusPill
          label="Data storage"
          value={
            config.storeFullText
              ? 'Full text (flagged on)'
              : config.developmentMode
                ? 'Redacted · development'
                : 'Redacted'
          }
          tone={config.storeFullText ? 'warning' : 'neutral'}
        />
        <StatusPill
          label="Name redaction"
          value={config.redactNames ? 'On' : 'Off'}
          tone={config.redactNames ? 'neutral' : 'warning'}
        />
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Max stored text: {config.maxTextLength.toLocaleString()} chars · Configure via{' '}
        <code className="text-slate-400">NEXT_PUBLIC_INDICARE_LAB_SHADOW_REVIEW_ENABLED</code> and related
        env vars. Defaults to enabled in development only.
      </p>
    </LabSectionCard>
  )
}
