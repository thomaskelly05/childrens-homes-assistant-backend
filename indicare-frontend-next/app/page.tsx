import Link from 'next/link'

function SignalCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <section className="ic-signal-card">
      <p className="ic-eyebrow">{label}</p>
      <p style={{ marginTop: '0.75rem', fontSize: '2rem', fontWeight: 950, letterSpacing: '-0.05em' }}>{value}</p>
      <p style={{ marginTop: '0.5rem', color: '#64748b', lineHeight: 1.55 }}>{detail}</p>
    </section>
  )
}

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', padding: 'clamp(1rem, 3vw, 2rem)' }}>
      <div className="ic-story-page" style={{ maxWidth: 1180, margin: '0 auto' }}>
        <section className="ic-hero-card">
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '1.5rem' }}>
            <div>
              <p className="ic-eyebrow">IndiCare OS · canonical frontend</p>
              <h1 className="ic-title" style={{ margin: '0.8rem 0 0', fontSize: 'clamp(3rem, 8vw, 6.8rem)' }}>
                The child’s story, seen clearly.
              </h1>
              <p className="ic-body-copy" style={{ marginTop: '1.2rem', maxWidth: 820, fontSize: '1.05rem' }}>
                A purpose-built operating system for adults working in Ofsted regulated children’s homes: story-first profiles, safer recording, live review, evidence, home oversight and ORB as the quiet intelligence on your shoulder.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link className="ic-primary-action" href="/young-people/1">Open child story</Link>
              <Link className="ic-secondary-action" href="/assistant/orb">Open ORB</Link>
              <Link className="ic-secondary-action" href="/homes">Choose home</Link>
            </div>
          </div>
        </section>

        <section className="ic-today-grid">
          <SignalCard label="Story first" value="01" detail="Adults start with who the child is, not a form or dashboard." />
          <SignalCard label="Record with care" value="02" detail="Daily notes, incidents, keywork and voice connect to chronology and review." />
          <SignalCard label="Evidence alive" value="03" detail="Plans, documents, actions and quality evidence stay linked and visible." />
          <SignalCard label="ORB" value="04" detail="The OS brain answers from permissioned records, documents and oversight data." />
        </section>

        <section className="ic-section-grid-2">
          <section className="ic-story-card">
            <p className="ic-eyebrow">What this is</p>
            <h2 style={{ marginTop: '0.5rem', fontSize: '2rem', fontWeight: 950 }}>The canonical IndiCare OS frontend</h2>
            <p className="ic-body-copy" style={{ marginTop: '1rem' }}>
              This folder is now the production home for the brief-led OS experience. The old split between frontend-next and indicare-app should be migrated into this app so the deployed service shows one clear IndiCare OS.
            </p>
          </section>
          <section className="ic-orb-strip">
            <p className="ic-eyebrow" style={{ color: '#a5f3fc' }}>ORB showstopper</p>
            <h2 style={{ marginTop: '0.5rem', color: 'white', fontSize: '2rem', fontWeight: 950 }}>Ask once. Search the OS. Save adult time.</h2>
            <p style={{ marginTop: '1rem' }}>
              ORB should answer from young people, home and provider context using records, documents, chronology, plans, actions and evidence the adult is allowed to see.
            </p>
          </section>
        </section>
      </div>
    </main>
  )
}
