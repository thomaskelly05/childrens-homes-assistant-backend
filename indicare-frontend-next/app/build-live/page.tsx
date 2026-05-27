import Link from 'next/link'
import { IndiCareOsShell, SignalCard, StoryCard, SoftRow } from '@/components/os/IndiCareOsShell'

export default function BuildLivePage() {
  return (
    <IndiCareOsShell
      eyebrow="Live Build"
      title="This is the canonical IndiCare OS front door."
      subtitle="Use this page to confirm you are seeing the new brief-led frontend, not an old duplicate OS."
      contextLabel="indicare-frontend-next"
      nav={[
        { label: 'Build live', href: '/build-live', active: true },
        { label: 'Start', href: '/' },
        { label: 'Choose home', href: '/homes' },
        { label: 'Young person story', href: '/young-people/1' },
        { label: 'ORB', href: '/assistant/orb' }
      ]}
    >
      <div className="ic-story-page">
        <section className="ic-hero-card">
          <p className="ic-eyebrow">Canonical runtime marker</p>
          <h2 className="ic-title" style={{ margin: '0.8rem 0 0', fontSize: 'clamp(2.7rem, 6vw, 5.4rem)' }}>
            If you can see this, the new home is coming through.
          </h2>
          <p className="ic-body-copy" style={{ maxWidth: 850, marginTop: '1rem' }}>
            This page exists so you can confirm in real time that Render is serving `indicare-frontend-next`, the new brief-led IndiCare OS frontend.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link className="ic-primary-action" href="/">Open new OS start</Link>
            <Link className="ic-secondary-action" href="/assistant/orb">Open OS ORB</Link>
          </div>
        </section>

        <section className="ic-today-grid">
          <SignalCard label="Frontend" value="Canonical" detail="The production service should now build from indicare-frontend-next." />
          <SignalCard label="Legacy" value="Blocked" detail="Old front doors should redirect or remain dormant, not compete with the new OS." />
          <SignalCard label="ORB" value="OS-linked" detail="ORB should call /api/assistant/orb/conversation and show evidence." />
          <SignalCard label="Build" value="Visible" detail="This page is the simple proof that the new frontend is live." />
        </section>

        <section className="ic-section-grid-2">
          <StoryCard eyebrow="Current active routes" title="New OS surfaces">
            <div className="ic-soft-list">
              <SoftRow label="/" value="Brief-led OS landing page." />
              <SoftRow label="/homes" value="Choose home screen." />
              <SoftRow label="/young-people/1" value="Story-first child page." />
              <SoftRow label="/young-people/1/workspace" value="Today workspace." />
              <SoftRow label="/young-people/1/records/new" value="Record with care." />
              <SoftRow label="/assistant/orb" value="OS-linked ORB conversation." />
              <SoftRow label="/assistant/orb/diagnostics" value="ORB evidence diagnostics." />
            </div>
          </StoryCard>
          <StoryCard eyebrow="What to check" title="Do this after deploy">
            <div className="ic-soft-list">
              <SoftRow label="1" value="Open /build-live and confirm this page appears." />
              <SoftRow label="2" value="Open / and confirm it says First, understand the child." />
              <SoftRow label="3" value="Open /assistant/orb and ask a test question." />
              <SoftRow label="4" value="Open /assistant/orb/diagnostics and check evidence count." />
            </div>
          </StoryCard>
        </section>
      </div>
    </IndiCareOsShell>
  )
}
