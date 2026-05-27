import Link from 'next/link'
import { ReactNode } from 'react'

type NavItem = {
  label: string
  href: string
  active?: boolean
}

export function IndiCareOsShell({
  children,
  eyebrow = 'IndiCare OS',
  title = 'Child-centred operating system',
  subtitle = 'Understand the child. Support today. Record clearly. Evidence care.',
  nav = [],
  contextLabel = 'Canonical frontend',
  orbHref = '/assistant/orb'
}: {
  children: ReactNode
  eyebrow?: string
  title?: string
  subtitle?: string
  nav?: NavItem[]
  contextLabel?: string
  orbHref?: string
}) {
  return (
    <main className="ic-os-shell">
      <aside className="ic-os-side" aria-label="IndiCare OS navigation">
        <Link href="/" className="ic-brand-card">
          <span className="ic-brand-mark">IC</span>
          <span>
            <span className="ic-brand-kicker">IndiCare</span>
            <strong>OS</strong>
          </span>
        </Link>
        <div className="ic-context-card">
          <p className="ic-eyebrow">Context</p>
          <p>{contextLabel}</p>
        </div>
        <nav className="ic-side-nav">
          {(nav.length ? nav : [
            { label: 'Choose home', href: '/homes' },
            { label: 'Young people', href: '/young-people/1' },
            { label: 'ORB', href: '/assistant/orb' }
          ]).map((item) => (
            <Link key={item.href} href={item.href} className={item.active ? 'active' : ''}>
              {item.label}
              <span>›</span>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="ic-os-main">
        <header className="ic-os-topbar">
          <div>
            <p className="ic-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <Link href={orbHref} className="ic-orb-button">
            <span className="ic-orb-dot" />
            Ask ORB
          </Link>
        </header>
        <div className="ic-os-content">{children}</div>
      </section>
    </main>
  )
}

export function SignalCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <section className="ic-signal-card">
      <p className="ic-eyebrow">{label}</p>
      <p className="ic-signal-value">{value}</p>
      <p>{detail}</p>
    </section>
  )
}

export function StoryCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="ic-story-card">
      <p className="ic-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="ic-body-copy">{children}</div>
    </section>
  )
}

export function SoftRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ic-soft-row">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

export function GentleEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="ic-empty-card">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}
