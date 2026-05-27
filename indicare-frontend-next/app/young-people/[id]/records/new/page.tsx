import Link from 'next/link'
import { IndiCareOsShell, SignalCard, StoryCard, SoftRow, GentleEmpty } from '@/components/os/IndiCareOsShell'

const recordTypes = [
  { label: 'Daily note', detail: 'What happened today, what the child communicated, what helped, and what changed.' },
  { label: 'Incident', detail: 'Record behaviour as communication, actions taken, de-escalation and follow-up.' },
  { label: 'Safeguarding concern', detail: 'Capture concern, immediate action, manager notification and next safeguarding step.' },
  { label: 'Missing episode', detail: 'Record chronology, return, voice of the child and risk review impact.' },
  { label: 'Keywork', detail: 'Capture discussion, child voice, goals, support offered and agreed actions.' },
  { label: 'Health / appointment', detail: 'Record appointment, professional advice, outcome and plan updates.' },
  { label: 'Child voice', detail: 'Keep the child’s wishes, feelings and views visible in the journey.' },
  { label: 'Handover', detail: 'Record shift-to-shift safety, actions, risks, good moments and follow-up.' }
]

export default function NewRecordPage({ params }: { params: { id: string } }) {
  const name = params.id === '1' ? 'Jayden' : 'Young person'

  return (
    <IndiCareOsShell
      eyebrow="Record With Care"
      title={`What are you recording for ${name}?`}
      subtitle="Start with purpose, write therapeutically, connect evidence and make the next adult safer."
      contextLabel={`${name} · Recording`}
      orbHref={`/assistant/orb?scope=child&child_id=${params.id}&prompt=Help%20me%20write%20this%20therapeutically`}
      nav={[
        { label: 'Story', href: `/young-people/${params.id}` },
        { label: 'Today', href: `/young-people/${params.id}/workspace` },
        { label: 'Record', href: `/young-people/${params.id}/records/new`, active: true },
        { label: 'Chronology', href: `/young-people/${params.id}/chronology` },
        { label: 'Plans', href: `/young-people/${params.id}/plans` },
        { label: 'Documents', href: `/young-people/${params.id}/documents` },
        { label: 'ORB', href: `/assistant/orb?scope=child&child_id=${params.id}` }
      ]}
    >
      <div className="ic-story-page">
        <section className="ic-hero-card">
          <p className="ic-eyebrow">Therapeutic recording</p>
          <h2 className="ic-title" style={{ margin: '0.8rem 0 0', fontSize: 'clamp(2.6rem, 6vw, 5.2rem)' }}>
            Record the journey, not just the event.
          </h2>
          <p className="ic-body-copy" style={{ maxWidth: 850, marginTop: '1rem' }}>
            A good record helps the next adult understand the child. It should connect what happened, what the child may have been communicating, what adults did, what helped, what needs review and how plans should respond.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
            <Link className="ic-primary-action" href={`/assistant/orb?scope=child&child_id=${params.id}&prompt=Help%20me%20write%20this%20therapeutically`}>Ask ORB to coach wording</Link>
            <Link className="ic-secondary-action" href={`/young-people/${params.id}/workspace`}>Back to today</Link>
          </div>
        </section>

        <section className="ic-today-grid">
          <SignalCard label="Purpose" value="Why" detail="Why are you recording this and who needs to know?" />
          <SignalCard label="Voice" value="Child" detail="What did the child say, show, feel or communicate?" />
          <SignalCard label="Action" value="Adult" detail="What did adults do and what helped or did not help?" />
          <SignalCard label="Review" value="Next" detail="What needs follow-up, sign-off, plan change or manager review?" />
        </section>

        <section className="ic-section-grid-2">
          {recordTypes.map((type) => (
            <Link key={type.label} href={`/young-people/${params.id}/records/new?type=${encodeURIComponent(type.label)}`} className="ic-story-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <p className="ic-eyebrow">Record route</p>
              <h2>{type.label}</h2>
              <p className="ic-body-copy" style={{ marginTop: '0.75rem' }}>{type.detail}</p>
              <span className="ic-secondary-action" style={{ marginTop: '1rem' }}>Open form</span>
            </Link>
          ))}
        </section>

        <section className="ic-section-grid-2">
          <StoryCard eyebrow="ORB recording coach" title="How ORB should support writing">
            <div className="ic-soft-list">
              <SoftRow label="Tone" value="Neutral, factual, warm and non-blaming." />
              <SoftRow label="Meaning" value="Behaviour described as communication, not judgement." />
              <SoftRow label="Evidence" value="Dates, people, actions and outcomes clearly linked." />
              <SoftRow label="Next step" value="Follow-up actions, manager review and plan impact visible." />
            </div>
          </StoryCard>
          <section className="ic-orb-strip">
            <p className="ic-eyebrow">Live prompt</p>
            <h2>Before submitting, ask ORB: what is missing?</h2>
            <p>ORB should help identify missing child voice, unclear actions, plan impact, manager review needs and risky wording. It should not submit records for adults.</p>
            <Link href={`/assistant/orb?scope=child&child_id=${params.id}&prompt=${encodeURIComponent('Review this record for therapeutic wording and missing evidence')}`} className="ic-primary-action" style={{ marginTop: '1rem' }}>Review with ORB</Link>
          </section>
        </section>

        <GentleEmpty title="Typed forms come next" description="This page establishes the correct recording entry point. Next pass should add the actual typed fields and save logic for each record type using existing backend endpoints." />
      </div>
    </IndiCareOsShell>
  )
}
