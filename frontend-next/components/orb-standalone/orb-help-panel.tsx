'use client'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  ORB_HELP_PANEL_SUBTITLE,
  ORB_HELP_PANEL_TITLE,
  ORB_NAV_RECORDS
} from '@/lib/orb/orb-user-facing-names'

const SECTIONS = [
  {
    title: 'What ORB is',
    body: 'ORB is IndiCare\'s residential care companion — a premium AI workspace for thinking, recording quality, reflection and professional reasoning in children\'s homes.'
  },
  {
    title: 'What ORB Residential can do',
    body: 'Help with wording, safeguarding thinking, Ofsted/SCCIF reflection, therapeutic interpretation, supervision prep, chronology reasoning, pattern recognition and general questions — using your profile, conversation, uploads and IndiCare residential intelligence.'
  },
  {
    title: 'What ORB Residential cannot do',
    body: 'ORB Residential does not access IndiCare OS records. It does not make safeguarding threshold decisions, replace LADO, police, social worker, clinical or legal advice, or predict Ofsted outcomes.'
  },
  {
    title: 'When to use OS ORB',
    body: 'Use IndiCare OS ORB for permissioned operational context — live chronology, child context, tasks and evidence where your role allows.'
  },
  {
    title: 'Safeguarding boundaries',
    body: 'ORB supports thinking, recording quality and reflection. It does not replace safeguarding procedures, LADO, police, social worker, clinical or legal advice. If a child is at immediate risk, follow local safeguarding and emergency procedures.'
  },
  {
    title: 'Chat starters',
    body: 'Use starters such as Daily record, Safeguarding reflection, or Help me record this properly. These are actions in Chat — not separate product areas.'
  },
  {
    title: 'Learning / Academy / NVQ',
    body: 'Tools and follow-up chips can help with diplomas, reflective accounts, evidence mapping and assessor support. ORB uses only what you type — it does not access live Academy learner records or invent workplace evidence.'
  },
  {
    title: 'Profile roles',
    body: 'Set your role in Profile (support worker, manager, Reg 44, NVQ assessor, NVQ learner, etc.) so ORB shapes answers and “What am I missing?” for your job — still without live OS records.'
  },
  {
    title: 'Actions & follow-ups',
    body: 'Under each answer, use Copy, Regenerate, Save, or suggested chips such as recording wording, safeguarding lens, or manager oversight — only when they fit your question.'
  },
  {
    title: 'Document intelligence',
    body: 'Attach a document from Tools or the Documents panel, then use lenses such as Explain, Summarise, Action plan or Reg 44 review. ORB uses your upload — not live OS records.'
  },
  {
    title: 'Handover and shift notes',
    body: 'Use Chat or Dictate for handover notes and shift reflection. Treat outputs as drafts for your professional judgement and manager oversight.'
  },
  {
    title: 'Voice and accessibility',
    body: 'Push-to-talk voice input is optional and only starts when you tap the microphone — ORB does not listen passively. Auto-speak reads completed answers using your chosen voice; it never requests microphone permission for speech output.'
  },
  {
    title: `Projects and ${ORB_NAV_RECORDS}`,
    body: `Organise chats in projects and save useful records and drafts from Chat, Dictate or Voice. Open ${ORB_NAV_RECORDS} from the sidebar to review before use in practice.`
  },
  {
    title: 'ORB Residential data safety',
    body:
      'Avoid unnecessary personal details; use initials where you can. Records and drafts are stored for adult review and reuse — not automatic care decisions. IndiCare OS ORB (/assistant/orb) may use permissioned OS records only where explicitly available and allowed.'
  },
  {
    title: 'Privacy and data',
    body: 'Chats and profiles are stored on this device unless you export them. ORB Residential does not send child records to IndiCare OS without the operational assistant.'
  },
  {
    title: 'Quick shortcuts',
    body: 'New chat from the sidebar · Search chats · Settings for appearance, voice and personalisation · Profile for role-based suggestions · Edit a sent message from the message actions row.'
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
      <div className="space-y-4 p-4" data-orb-help-panel data-orb-flagship-product-modal="true">
        {SECTIONS.map((section) => (
          <section key={section.title} className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">{section.title}</h3>
            <p className="mt-1.5 text-xs leading-6 text-[var(--orb-muted)]">{section.body}</p>
          </section>
        ))}
        <p className="text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-help-safeguarding-boundary>
          ORB Residential does not access IndiCare OS records. Use OS ORB for permissioned operational
          context. If a child is at immediate risk, follow local safeguarding and emergency procedures.
        </p>
      </div>
    </OrbStandalonePanelShell>
  )
}
