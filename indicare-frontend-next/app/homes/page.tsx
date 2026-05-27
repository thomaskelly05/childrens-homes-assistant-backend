import Link from 'next/link'
import { IndiCareOsShell, SignalCard, StoryCard, SoftRow } from '@/components/os/IndiCareOsShell'

const homes = [
  {
    name: 'Oak House',
    location: 'North East',
    manager: 'Registered Manager',
    youngPeople: 4,
    staff: 3,
    signOff: 2,
    riskDue: 1,
    climate: 'Settled'
  },
  {
    name: 'Willow View',
    location: 'North East',
    manager: 'Deputy Manager covering',
    youngPeople: 3,
    staff: 2,
    signOff: 4,
    riskDue: 2,
    climate: 'Busy but safe'
  }
]

export default function HomesPage() {
  return (
    <IndiCareOsShell
      eyebrow="Choose Home"
      title="Which home are you working in today?"
      subtitle="Set the home context first so IndiCare understands role, permissions, shift status and what matters today."
      contextLabel="Home selection"
      nav={[
        { label: 'Start', href: '/' },
        { label: 'Choose home', href: '/homes', active: true },
        { label: 'Young person story', href: '/young-people/1' },
        { label: 'ORB', href: '/assistant/orb' }
      ]}
    >
      <div className="ic-story-page">
        <section className="ic-hero-card">
          <p className="ic-eyebrow">Home context</p>
          <h2 className="ic-title" style={{ margin: '0.8rem 0 0', fontSize: 'clamp(2.6rem, 6vw, 5.2rem)' }}>
            Start with the home, then the child.
          </h2>
          <p className="ic-body-copy" style={{ maxWidth: 820, marginTop: '1rem' }}>
            Staff, managers, responsible individuals and provider leaders may work across more than one home. This screen should calmly answer: what home am I in, who is here, and what needs attention today?
          </p>
        </section>

        <section className="ic-section-grid-2">
          {homes.map((home) => (
            <Link key={home.name} href="/young-people/1" className="ic-story-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <p className="ic-eyebrow">Children’s Home</p>
              <h2>{home.name}</h2>
              <p className="ic-body-copy" style={{ marginTop: '0.7rem' }}>{home.location} · Manager: {home.manager}</p>
              <div className="ic-soft-list" style={{ marginTop: '1rem' }}>
                <SoftRow label="Young people" value={`${home.youngPeople} currently living here`} />
                <SoftRow label="Shift" value={`${home.staff} staff on shift`} />
                <SoftRow label="Manager oversight" value={`${home.signOff} records awaiting sign-off`} />
                <SoftRow label="Risk review" value={`${home.riskDue} risk review due`} />
                <SoftRow label="Home climate" value={home.climate} />
              </div>
              <span className="ic-primary-action" style={{ marginTop: '1rem' }}>Open home</span>
            </Link>
          ))}
        </section>

        <section className="ic-today-grid">
          <SignalCard label="Today" value="Home" detail="Who is in, who is out, what is due and what needs adult attention." />
          <SignalCard label="Safety" value="Live" detail="Safeguarding, risk, medication, contact and missing information should surface calmly." />
          <SignalCard label="Oversight" value="Seen" detail="Records awaiting sign-off and Reg 44/45 readiness should be visible." />
          <SignalCard label="ORB" value="Aware" detail="ORB should answer from the selected home context and user permissions." />
        </section>

        <StoryCard eyebrow="Build note" title="This is the new home-selection foundation">
          <p>Next pass will wire this page to the live home selector routes. For now it establishes the correct product behaviour and language in the canonical frontend.</p>
        </StoryCard>
      </div>
    </IndiCareOsShell>
  )
}
