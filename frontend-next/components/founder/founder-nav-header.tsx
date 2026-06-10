'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Beaker, Bot, Brain, CheckSquare, Contact, FileCheck, FileText, Lock, Radio, RefreshCw, ScrollText, Users } from 'lucide-react'

type NavLink = {
  href: string
  label: string
  icon: typeof Users | typeof FileText | typeof CheckSquare | typeof Radio | typeof Bot | typeof RefreshCw | typeof Brain | typeof Contact | null
  exact?: boolean
}

const NAV_LINKS: NavLink[] = [
  { href: '/founder', label: 'Command Centre', icon: null, exact: true },
  { href: '/founder/team', label: 'Founder Team', icon: Users },
  { href: '/founder/operating-loop', label: 'Operating Loop', icon: RefreshCw },
  { href: '/founder/content', label: 'Content', icon: FileText },
  { href: '/founder/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/founder/telemetry', label: 'Telemetry', icon: Radio },
  { href: '/founder/briefing', label: 'Briefing', icon: null },
  { href: '/founder/actions', label: 'Actions', icon: null },
  { href: '/founder/build-briefs', label: 'Build Briefs', icon: null },
  { href: '/founder/quality-lab', label: 'Quality Lab', icon: Beaker },
  { href: '/founder/evidence', label: 'Evidence', icon: FileCheck },
  { href: '/founder/relationships', label: 'Relationships', icon: Contact },
  { href: '/founder/audit', label: 'Audit Trail', icon: ScrollText },
  { href: '/founder/memory', label: 'Memory', icon: Brain },
  { href: '/founder/orb', label: 'ORB Founder', icon: Bot }
]

type FounderNavHeaderProps = {
  title: string
  subtitle?: string
  showBack?: boolean
  backHref?: string
}

export function FounderNavHeader({ title, subtitle, showBack = false, backHref = '/founder' }: FounderNavHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="founder-surface rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {showBack ? (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Founder-only
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">{subtitle}</p> : null}
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Founder navigation">
        {NAV_LINKS.map((link) => {
          const isActive = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                isActive
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
