import Link from 'next/link'
import { IndiCareOsShell, SignalCard, StoryCard, SoftRow, GentleEmpty } from '@/components/os/IndiCareOsShell'

export default function YoungPersonWorkspacePage({ params }: { params: { id: string } }) {
  const name = params.id === '1' ? 'Jayden' : 'Young person'

  return (
    <IndiCareOsShell
      eyebrow="Today Workspace"
      title={`${name}'s day, in one calm view.`}
      subtitle="A shift-friendly workspace for what adults need to know, record, review and follow up today."
      contextLabel={`${name} · Today`}
      orbHref={`/assistant/orb?scope=child&child_id=${params.id}`}
      nav={[
        { label: 'Story', href: `/young-people/${params.id}` },
        { label: 'Today', href: `/young-people/${params.id}/workspace`, active: true },
        { label: 'Record', href: `/young-people/${params.id}/records/new` },
        { label: 'Chronology', href: `/young-people/${params.id}/chronology` },
        { label: 'Plans', href: `/young-people/${params.id}/plans` },
        { label: 'Documents', href: `/young-people/${params.id}/documents` },
        { label: 'ORB', href: `/assistant/orb?scope=child&child_id=${params.id}` }
      ]}
    >
      <div className="ic-story-page">
        <section className="ic-hero-card">
          <p className="ic-eyebrow">What adults need to know today</p>
          <h2 className="ic-title" style={{ margin: '0.8rem 0 0', fontSize: 'clamp(2.6rem, 6vw, 5.2rem)' }}>
            Support first. Record second. Review always.
          </h2>
          <p className="ic-body-copy" style={{ maxWidth: 850, marginTop: '1rem' }}>
            This workspace should reduce duplication. Adults should see the child’s presentation, key risks, appointments, handover, records needing review and ORB prompts in one place before they start writing.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
            <Link className="ic-primary-action" href={`/young-people/${params.id}/records/new`}>Record with care</Link>
            <Link className="ic-secondary-action" href={`/assistant/orb?scope=child&child_id=${params.id}`}>Ask ORB</Link>
            <Link className="ic-secondary-action" href={`/young-people/${params.id}`}>Back to story</Link>
          </div>
        </section>

        <section className="ic-today-grid">
          <SignalCard label="Presentation" value="Settled" detail="Show today’s observed presentation and what helped." />
          <SignalCard label="Review queue" value="3" detail="Items awaiting manager review, sign-off or follow-up." />
          <SignalCard label="Appointments" value="1" detail="Health, education, contact or professional appointments due." />
          <SignalCard label="Records" value="Live" detail="Daily notes, incidents, keywork and voice should connect to chronology." />
        </section>

        <section className="ic-section-grid-2">
          <StoryCard eyebrow="Immediate support" title="What helps today">
            <div className="ic-soft-list">
              <SoftRow label="Communication" value="Use short, clear language and offer choices." />
              <SoftRow label="Routine" value="Keep transitions predictable and explain changes early." />
              <SoftRow label="Escalation support" value="Reduce demands, offer space and record what helped afterwards." />
            </div>
          </StoryCard>

          <section className="ic-orb-strip">
            <p className="ic-eyebrow">ORB on your shoulder</p>
            <h2>Ask what changed, what is missing, and what needs action.</h2>
            <p>ORB should pull from this child’s records, appointments, plans, documents and review queue. It should not guess.</p>
            <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1rem' }}>
              {['What needs manager review?', 'When was the last appointment?', 'What changed in the last 30 days?', 'What evidence is missing?'].map((prompt) => (
                <Link key={prompt} href={`/assistant/orb?scope=child&child_id=${params.id}&prompt=${encodeURIComponent(prompt)}`} className="ic-secondary-action" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', borderColor: 'rgba(255,255,255,0.18)', justifyContent: 'flex-start' }}>{prompt}</Link>
              ))}
            </div>
          </section>
        </section>

        <section className="ic-section-grid-3">
          <StoryCard eyebrow="Review queue" title="Needs adult attention">
            <div className="ic-soft-list">
              <SoftRow label="Submitted" value="Daily note awaiting manager review." />
              <SoftRow label="Due soon" value="Risk plan review needs checking." />
              <SoftRow label="Follow-up" value="Appointment outcome should be linked to the plan." />
            </div>
          </StoryCard>
          <StoryCard eyebrow="Chronology" title="What happened recently">
            <div className="ic-soft-list">
              <SoftRow label="Today" value="Daily presentation and support offered." />
              <SoftRow label="This week" value="Keywork and school updates will surface here." />
              <SoftRow label="This month" value="Patterns and changes should be visible to ORB." />
            </div>
          </StoryCard>
          <StoryCard eyebrow="Handover" title="Shift-to-shift safety">
            <div className="ic-soft-list">
              <SoftRow label="Risks" value="Any live risks that need the next adult to know." />
              <SoftRow label="Actions" value="What still needs doing before the shift ends." />
              <SoftRow label="Good moments" value="Progress, connection and positive memories should not be lost." />
            </div>
          </StoryCard>
        </section>

        <GentleEmpty title="Live wiring next" description="This page is now the correct brief-led workspace shape. Next pass should connect it to the existing child workspace/review queue endpoints instead of hard-coded placeholder rows." />
      </div>
    </IndiCareOsShell>
  )
}
