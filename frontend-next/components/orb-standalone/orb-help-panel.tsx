'use client'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  ORB_HELP_PANEL_SUBTITLE,
  ORB_HELP_PANEL_TITLE,
  ORB_NAV_RECORDS
} from '@/lib/orb/orb-user-facing-names'

const SECTIONS = [
  {
    title: 'What ORB can help with',
    body: 'Wording, reflection, safeguarding thinking, supervision prep, chronology reasoning, and clearer evidence — using what you type and upload. Chat, Dictate, Voice and ORB Write support adult-led recording and review.'
  },
  {
    title: 'What ORB cannot do',
    body: 'ORB does not access IndiCare OS records, make safeguarding threshold decisions, replace LADO, police, social worker, clinical or legal advice, or predict Ofsted outcomes.'
  },
  {
    title: 'Safe use',
    body: 'Use minimal or anonymised details where possible. Review every output before use. ORB supports professional judgement — it does not replace management oversight or local policy.'
  },
  {
    title: 'Safeguarding boundaries',
    body: 'If a child is at immediate risk, follow local safeguarding and emergency procedures. ORB supports thinking and recording quality — not automated safeguarding decisions.'
  },
  {
    title: 'Data and privacy',
    body: `Chats and ${ORB_NAV_RECORDS.toLowerCase()} are stored for adult review on this device unless you export them. ORB Residential does not send child records to IndiCare OS without the operational assistant.`
  }
] as const

export function OrbHelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <OrbStandalonePanelShell
      open={open}
      title={ORB_HELP_PANEL_TITLE}
      subtitle={ORB_HELP_PANEL_SUBTITLE}
      onClose={onClose}
      ariaLabel="ORB help and safety"
      panelId="help"
      layout="center"
    >
      <div
        className="orb-help-panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
        data-orb-help-panel-scroll
      >
        <div className="orb-help-safety-panel space-y-3 p-4 orb-modal--plain orb-modal--scroll-safe orb-modal--no-clip" data-orb-help-panel data-orb-modal="product">
          <header className="orb-help-safety-panel__header flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3" data-orb-help-safety-header>
            <GlassOrbMark size="sm" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]">ORB Residential</p>
              <p className="text-sm text-[var(--orb-muted)]">{ORB_HELP_PANEL_SUBTITLE}</p>
            </div>
          </header>
          {SECTIONS.map((section) => (
            <section key={section.title} className="orb-modal-section">
              <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">{section.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--orb-muted)]">{section.body}</p>
            </section>
          ))}
          <p className="text-sm leading-6 text-[var(--orb-muted)]" data-orb-help-safeguarding-boundary>
            If a child is at immediate risk, follow local safeguarding and emergency procedures. ORB supports
            professional judgement — it does not replace safeguarding procedures or local policy.
          </p>
        </div>
      </div>
    </OrbStandalonePanelShell>
  )
}
