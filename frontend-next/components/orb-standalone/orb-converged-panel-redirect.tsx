'use client'

import { ArrowRight } from 'lucide-react'

import { OrbPremiumButton } from '@/components/orb/premium'
import type { OrbDeprecatedPrimaryNavPanelId } from '@/lib/orb/orb-navigation-convergence'
import { resolveConvergedNavigation } from '@/lib/orb/orb-navigation-convergence'

const DEPRECATED_PANEL_LABELS: Record<OrbDeprecatedPrimaryNavPanelId, string> = {
  shift_builder: 'Shift Builder',
  review: 'Review',
  inspection_readiness: 'Inspection Readiness',
  safeguarding_thinking: 'Safeguarding Thinking',
  record_properly: 'Record This Properly',
  knowledge: 'Knowledge Library'
}

/** Deprecated from primary nav; capability now lives in Chat/Templates/ORB Write/Documents. */
export function OrbConvergedPanelRedirect({
  panelId,
  onContinue,
  onDismiss
}: {
  panelId: OrbDeprecatedPrimaryNavPanelId
  onContinue: () => void
  onDismiss: () => void
}) {
  const route = resolveConvergedNavigation(panelId)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      data-orb-converged-redirect
      data-orb-converged-redirect-panel={panelId}
      role="dialog"
      aria-labelledby="orb-converged-redirect-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-5 shadow-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
          Moved into ORB Residential
        </p>
        <h2 id="orb-converged-redirect-title" className="mt-1 text-lg font-semibold text-[var(--orb-foreground)]">
          {DEPRECATED_PANEL_LABELS[panelId]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--orb-muted)]">{route.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <OrbPremiumButton onClick={onContinue} data-orb-converged-redirect-continue>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </OrbPremiumButton>
          <OrbPremiumButton variant="secondary" onClick={onDismiss} data-orb-converged-redirect-dismiss>
            Stay in Chat
          </OrbPremiumButton>
        </div>
      </div>
    </div>
  )
}
