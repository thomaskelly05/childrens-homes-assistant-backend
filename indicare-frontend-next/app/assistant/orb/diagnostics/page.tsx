import Link from 'next/link'
import { IndiCareOsShell, StoryCard, SoftRow } from '@/components/os/IndiCareOsShell'
import { OrbDiagnosticsPanel } from '@/components/orb/OrbDiagnosticsPanel'

export default function OrbDiagnosticsPage({ searchParams }: { searchParams?: { scope?: 'child' | 'home' | 'provider' | 'current_user'; child_id?: string; home_id?: string } }) {
  const scope = searchParams?.scope || 'child'
  const childId = searchParams?.child_id || '1'
  const homeId = searchParams?.home_id

  return (
    <IndiCareOsShell
      eyebrow="ORB Diagnostics"
      title="Trust ORB by seeing what it checked."
      subtitle="Evidence diagnostics shows the runtime, scope, source tables, evidence returned and unavailable surfaces before you trust an answer."
      contextLabel="ORB evidence check"
      orbHref={`/assistant/orb?scope=${scope}&child_id=${childId}`}
      nav={[
        { label: 'Start', href: '/' },
        { label: 'Choose home', href: '/homes' },
        { label: 'Young person story', href: '/young-people/1' },
        { label: 'ORB', href: '/assistant/orb' },
        { label: 'Diagnostics', href: '/assistant/orb/diagnostics', active: true }
      ]}
    >
      <div className="ic-story-page">
        <section className="ic-hero-card">
          <p className="ic-eyebrow">Evidence, not guesswork</p>
          <h2 className="ic-title" style={{ margin: '0.8rem 0 0', fontSize: 'clamp(2.6rem, 6vw, 5.4rem)' }}>
            ORB should show its working.
          </h2>
          <p className="ic-body-copy" style={{ maxWidth: 860, marginTop: '1rem' }}>
            This page is for testing and confidence. It helps you see whether ORB is connected to the right child, home or provider context and whether the answer is backed by source-labelled records.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link className="ic-primary-action" href={`/assistant/orb?scope=${scope}&child_id=${childId}`}>Back to ORB</Link>
            <Link className="ic-secondary-action" href={`/young-people/${childId}`}>Open child story</Link>
          </div>
        </section>

        <OrbDiagnosticsPanel scope={scope} childId={childId} homeId={homeId} />

        <section className="ic-section-grid-2">
          <StoryCard eyebrow="What good looks like" title="A trustworthy ORB answer">
            <div className="ic-soft-list">
              <SoftRow label="Direct answer" value="ORB answers the actual question first." />
              <SoftRow label="Evidence used" value="ORB shows source-labelled records, dates, routes and summaries." />
              <SoftRow label="Limitations" value="ORB says what it cannot evidence from available records." />
              <SoftRow label="Next step" value="ORB suggests safe adult action, not automatic decisions." />
            </div>
          </StoryCard>
          <StoryCard eyebrow="When to be cautious" title="Do not rely on ORB blindly">
            <div className="ic-soft-list">
              <SoftRow label="No evidence" value="If diagnostics returns no evidence, ORB should not make claims." />
              <SoftRow label="Wrong scope" value="If the child or home context is wrong, change scope before asking." />
              <SoftRow label="Safeguarding" value="Escalate through policy and manager review. ORB supports, it does not decide." />
              <SoftRow label="Inspection" value="ORB can prepare evidence; it must not predict grades." />
            </div>
          </StoryCard>
        </section>
      </div>
    </IndiCareOsShell>
  )
}
