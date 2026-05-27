import Link from 'next/link'
import { IndiCareOsShell, SignalCard, StoryCard } from '@/components/os/IndiCareOsShell'

export default function HomePage() {
  return (
    <IndiCareOsShell
      eyebrow="IndiCare OS"
      title="The child’s story, seen clearly."
      subtitle="A calm operating system for children’s homes: understand the child, support today, record clearly and let ORB help adults see what matters."
      contextLabel="New canonical home"
      nav={[
        { label: 'Start', href: '/', active: true },
        { label: 'Choose home', href: '/homes' },
        { label: 'Young person story', href: '/young-people/1' },
        { label: 'ORB', href: '/assistant/orb' }
      ]}
    >
      <div className="ic-story-page">
        <section className="ic-hero-card">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="ic-eyebrow">Child-centred operating system</p>
            <h2 className="ic-title" style={{ margin: '0.85rem 0 0', fontSize: 'clamp(3rem, 8vw, 6.8rem)' }}>
              First, understand the child.
            </h2>
            <p className="ic-body-copy" style={{ marginTop: '1.2rem', maxWidth: 860, fontSize: '1.05rem' }}>
              IndiCare OS should not feel like a form library or database. It should help adults understand the young person, support the home today, record the journey with care, connect evidence, and use ORB to notice what could otherwise be missed.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.4rem' }}>
              <Link className="ic-primary-action" href="/homes">Choose home</Link>
              <Link className="ic-secondary-action" href="/young-people/1">Open child story</Link>
              <Link className="ic-secondary-action" href="/assistant/orb">Ask ORB</Link>
            </div>
          </div>
        </section>

        <section className="ic-today-grid">
          <SignalCard label="01" value="Login" detail="Secure, calm and professional. Not an AI toy. A safeguarding system." />
          <SignalCard label="02" value="Home" detail="Choose the home and understand what is happening there today." />
          <SignalCard label="03" value="Child" detail="Open the young person’s story before records, risks or forms." />
          <SignalCard label="04" value="ORB" detail="The quiet intelligence layer that answers from permissioned evidence." />
        </section>

        <section className="ic-section-grid-3">
          <StoryCard eyebrow="Culture" title="Story before recording">
            <p>The first young person page should feel like: before you record anything about me, understand who I am.</p>
          </StoryCard>
          <StoryCard eyebrow="Practice" title="Recording with care">
            <p>Records should capture what happened, what the child was communicating, what adults did, what changed, and what happens next.</p>
          </StoryCard>
          <StoryCard eyebrow="Oversight" title="Seen, reviewed, connected">
            <p>Important information should be recorded, reviewed, signed off and linked to chronology, plans, risks and provider oversight.</p>
          </StoryCard>
        </section>
      </div>
    </IndiCareOsShell>
  )
}
