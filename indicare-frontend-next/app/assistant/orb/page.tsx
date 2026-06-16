import Link from 'next/link'
import { IndiCareOsShell, SignalCard, StoryCard, SoftRow } from '@/components/os/IndiCareOsShell'
import { OrbConversationPanel } from '@/components/orb/OrbConversationPanel'

const prompts = [
  'Summarise this child’s last 30 days',
  'What needs manager review today?',
  'What has changed since the last plan review?',
  'What would Ofsted want to understand here?',
  'Find patterns in incidents or missing episodes',
  'Help rewrite this record therapeutically'
]

export default function OrbPage({ searchParams }: { searchParams?: { scope?: 'child' | 'home' | 'provider' | 'current_user'; child_id?: string; home_id?: string } }) {
  const scope = searchParams?.scope || 'child'
  const childId = searchParams?.child_id || '1'
  const homeId = searchParams?.home_id

  return (
    <IndiCareOsShell
      eyebrow="ORB Intelligence"
      title="The OS brain that saves adults time."
      subtitle="Ask once. ORB should search permissioned records, documents, chronology, plans, risks, actions and oversight evidence."
      contextLabel="OS-linked ORB"
      orbHref="/assistant/orb"
      nav={[
        { label: 'Start', href: '/' },
        { label: 'Choose home', href: '/homes' },
        { label: 'Young person story', href: '/young-people/1' },
        { label: 'ORB', href: '/assistant/orb', active: true }
      ]}
    >
      <div className="ic-story-page">
        <section className="ic-orb-strip">
          <p className="ic-eyebrow">Command mode</p>
          <h2 style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)', margin: '0.75rem 0 0', letterSpacing: '-0.07em' }}>
            There when needed. Quiet when not.
          </h2>
          <p style={{ maxWidth: 850, marginTop: '1rem', fontSize: '1.05rem', lineHeight: 1.75 }}>
            ORB is not a separate chatbot. It is the intelligence layer of IndiCare OS: child context, home context, provider oversight, evidence, review, recording quality and inspection thinking in one place.
          </p>
          <div style={{ display: 'grid', gap: '0.7rem', marginTop: '1.2rem' }}>
            {prompts.map((prompt) => (
              <Link key={prompt} href={`/assistant/orb?prompt=${encodeURIComponent(prompt)}&scope=${scope}&child_id=${childId}`} className="ic-secondary-action" style={{ justifyContent: 'flex-start', background: 'rgba(255,255,255,0.08)', color: 'white', borderColor: 'rgba(255,255,255,0.18)' }}>
                {prompt}
              </Link>
            ))}
          </div>
        </section>

        <OrbConversationPanel scope={scope} childId={childId} homeId={homeId} />

        <section className="ic-today-grid">
          <SignalCard label="Mode 1" value="Quiet" detail="Small glowing presence. It does not interrupt the adult’s work." />
          <SignalCard label="Mode 2" value="Support" detail="Expands when writing, reviewing or noticing missing evidence." />
          <SignalCard label="Mode 3" value="Command" detail="Big and bold when adults need answers, summaries or pattern finding." />
          <SignalCard label="Rule" value="Evidence" detail="If ORB cannot evidence something, it must say what is missing." />
        </section>

        <section className="ic-section-grid-2">
          <StoryCard eyebrow="Evidence spine" title="What ORB should search">
            <div className="ic-soft-list">
              <SoftRow label="Child" value="Story, daily records, chronology, plans, risks, voice, documents and appointments." />
              <SoftRow label="Home" value="Risks, alerts, staff, handover, safeguarding, reviews, Reg 44 and daily climate." />
              <SoftRow label="Provider" value="Themes, Inspection evidence preparation, trends, leadership oversight and quality evidence." />
            </div>
          </StoryCard>
          <StoryCard eyebrow="Inspector thinking" title="What ORB should help adults ask">
            <div className="ic-soft-list">
              <SoftRow label="Safety" value="Is the child safer because of the care being provided?" />
              <SoftRow label="Progress" value="Is the child making progress and is this evidenced?" />
              <SoftRow label="Voice" value="Is the child’s voice visible in records and plans?" />
              <SoftRow label="Oversight" value="Are managers seeing, reviewing and acting on what matters?" />
            </div>
          </StoryCard>
        </section>

        <section className="ic-live-card">
          <p className="ic-eyebrow">Diagnostics</p>
          <h2>Check what ORB can actually see</h2>
          <p className="ic-body-copy">Use the diagnostics view before trusting ORB in production. It shows runtime identity, scope, source tables, evidence count and unavailable surfaces.</p>
          <Link href={`/assistant/orb/diagnostics?scope=${scope}&child_id=${childId}`} className="ic-secondary-action" style={{ marginTop: '1rem' }}>Open ORB diagnostics</Link>
        </section>
      </div>
    </IndiCareOsShell>
  )
}
