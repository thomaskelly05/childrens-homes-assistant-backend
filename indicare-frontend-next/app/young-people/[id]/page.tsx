import Link from 'next/link'
import { IndiCareOsShell, SignalCard, StoryCard, SoftRow } from '@/components/os/IndiCareOsShell'

export default async function YoungPersonStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const name = id === '1' ? 'Jayden' : 'Young person'
  const nav = [
    { label: 'Story', href: `/young-people/${id}`, active: true },
    { label: 'Today', href: `/young-people/${id}/workspace` },
    { label: 'Record', href: `/young-people/${id}/records/new` },
    { label: 'Chronology', href: `/young-people/${id}/chronology` },
    { label: 'Plans', href: `/young-people/${id}/plans` },
    { label: 'Risks', href: `/young-people/${id}/risks` },
    { label: 'Documents', href: `/young-people/${id}/documents` },
    { label: 'ORB', href: `/assistant/orb?scope=child&child_id=${id}` }
  ]

  return (
    <IndiCareOsShell
      eyebrow="Young Person Profile & Story"
      title={`This is ${name}.`}
      subtitle="Before recording anything, understand who this child is, what matters, and how adults can support them today."
      contextLabel={`${name} · Story first`}
      orbHref={`/assistant/orb?scope=child&child_id=${id}`}
      nav={nav}
    >
      <div className="ic-story-page">
        <section className="ic-hero-card">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="ic-orb-glow" style={{ width: 112, height: 112, borderRadius: 32, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #38bdf8, #2563eb, #07111f)', color: 'white', fontSize: '2rem', fontWeight: 950 }}>
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <p className="ic-eyebrow">Before you record anything about me</p>
              <h2 className="ic-title" style={{ margin: '0.8rem 0 0', fontSize: 'clamp(3rem, 7vw, 6rem)' }}>
                Understand who I am.
              </h2>
              <p className="ic-body-copy" style={{ marginTop: '1rem', maxWidth: 820 }}>
                {name} is more than records, risks or forms. This page should introduce the young person to a caring adult: what matters, what helps, what worries them, how they communicate distress, and what adults need to know to support them safely.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <span className="ic-pill">Age 15</span>
                <span className="ic-pill">Legal status recorded here</span>
                <span className="ic-pill">Key worker visible</span>
                <span className="ic-pill">Risk: personal, not just RAG</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ic-today-grid">
          <SignalCard label="Today" value="Settled" detail="Daily presentation should show calmly, with context and support guidance." />
          <SignalCard label="Voice" value="Seen" detail="Wishes, feelings and child voice should not disappear inside records." />
          <SignalCard label="Plans" value="Linked" detail="Support, risk and care plans should respond to what is being recorded." />
          <SignalCard label="Review" value="Open" detail="Manager oversight should be visible without feeling punitive." />
        </section>

        <section className="ic-section-grid-3">
          <StoryCard eyebrow="My Story" title="Where I am in my journey">
            <p>This section will hold the child’s story, placement journey, important relationships, education, health, hopes, memories and what adults need to understand. It should be trauma-informed, not trauma-heavy.</p>
          </StoryCard>
          <StoryCard eyebrow="What Matters to Me" title="Things that help me feel safe">
            <div className="ic-soft-list">
              <SoftRow label="Favourite things" value="Football, music, cooking and routines can sit here." />
              <SoftRow label="Important people" value="Family, friends and trusted adults should be recorded safely." />
              <SoftRow label="Comfort and identity" value="Culture, faith, food, routines and comfort items should be visible." />
            </div>
          </StoryCard>
          <StoryCard eyebrow="How to Support Me" title="Practical guidance for adults">
            <div className="ic-soft-list">
              <SoftRow label="When calm" value="Use routine, warmth and clear choices." />
              <SoftRow label="When anxious" value="Slow down, reduce demands, offer time and space." />
              <SoftRow label="What escalates" value="Avoid labels, threats, sudden changes and unclear promises." />
            </div>
          </StoryCard>
        </section>

        <section className="ic-section-grid-2">
          <section className="ic-live-card">
            <p className="ic-eyebrow">Child navigation</p>
            <h2>Story comes first. Record comes after.</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' }}>
              {['Story', 'Today', 'Record', 'Chronology', 'Plans', 'Risks', 'Health', 'Education', 'Family', 'Voice', 'Documents', 'ORB'].map((tab, index) => (
                <Link key={tab} href={index === 0 ? `/young-people/${id}` : '#'} className={index === 0 ? 'ic-primary-action' : 'ic-secondary-action'}>
                  {tab}
                </Link>
              ))}
            </div>
          </section>
          <section className="ic-orb-strip">
            <p className="ic-eyebrow">ORB support mode</p>
            <h2>Quiet when not needed. Big when it matters.</h2>
            <p>ORB should answer from this child’s records, documents, chronology, plans, risks and actions. If evidence is missing, ORB should say what is missing instead of guessing.</p>
            <Link href={`/assistant/orb?scope=child&child_id=${id}`} className="ic-primary-action" style={{ marginTop: '1rem' }}>Ask ORB about {name}</Link>
          </section>
        </section>
      </div>
    </IndiCareOsShell>
  )
}
