'use client'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

const SECTIONS = [
  {
    title: 'What ORB is',
    body: 'ORB is IndiCare\'s residential care companion — a ChatGPT-style assistant for thinking, recording quality, reflection and professional reasoning in children\'s homes.'
  },
  {
    title: 'What standalone ORB can do',
    body: 'Help with wording, safeguarding thinking, Ofsted/SCCIF reflection, therapeutic interpretation, supervision prep, chronology reasoning, pattern recognition and general questions — without accessing live care records.'
  },
  {
    title: 'What standalone ORB cannot do',
    body: 'Standalone ORB does not access live child, staff or home records. It does not make safeguarding threshold decisions, replace LADO, police, social worker, clinical or legal advice, or predict Ofsted outcomes.'
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
    title: 'Residential agents',
    body: 'Agents such as Safeguarding Thinking, Record This Properly, Ofsted Lens and Manager Copilot shape tone and depth. You can switch agents from the composer or sidebar.'
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
    title: 'Shift Builder',
    body: 'Paste shift notes to draft handover prompts, incident flags and manager review questions. Treat outputs as drafts for your professional judgement.'
  },
  {
    title: 'Voice and accessibility',
    body: 'Push-to-talk voice input is optional and only starts when you tap the microphone — ORB does not listen passively. Auto-speak reads completed answers using your chosen voice; it never requests microphone permission for speech output.'
  },
  {
    title: 'Projects and saved outputs',
    body: 'Organise chats in projects, save useful outputs from the Library, and reuse them in new conversations. Saved outputs live under Library and Tools.'
  },
  {
    title: 'Privacy and data',
    body: 'Chats and profiles are stored on this device unless you export them. Standalone ORB does not send child records to IndiCare OS without the operational assistant.'
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
      title="Using ORB"
      subtitle="Standalone Care Companion"
      onClose={onClose}
      ariaLabel="ORB help"
      panelId="help"
      layout="center"
    >
      <div className="space-y-4 p-4" data-orb-help-panel>
        {SECTIONS.map((section) => (
          <section key={section.title} className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">{section.title}</h3>
            <p className="mt-1.5 text-xs leading-6 text-[var(--orb-muted)]">{section.body}</p>
          </section>
        ))}
        <p className="text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-help-safeguarding-boundary>
          Standalone ORB does not access live child, staff or home records. Use OS ORB for permissioned operational
          context. If a child is at immediate risk, follow local safeguarding and emergency procedures.
        </p>
      </div>
    </OrbStandalonePanelShell>
  )
}
