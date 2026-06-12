'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  Beaker,
  Bot,
  Brain,
  Building2,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  Contact,
  FileCheck,
  FileText,
  Lock,
  PoundSterling,
  Radio,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Timer,
  Users,
  Wallet,
  Workflow
} from 'lucide-react'

type NavLink = {
  href: string
  label: string
  icon:
    | typeof Users
    | typeof FileText
    | typeof CheckSquare
    | typeof Radio
    | typeof Bot
    | typeof RefreshCw
    | typeof Brain
    | typeof Contact
    | typeof Sparkles
    | typeof Beaker
    | typeof ClipboardCheck
    | typeof ShieldAlert
    | typeof Workflow
    | typeof Timer
    | typeof PoundSterling
    | typeof Wallet
    | typeof Building2
    | typeof ScrollText
    | typeof FileCheck
    | null
  exact?: boolean
}

type NavGroup = {
  id: string
  label: string
  defaultExpanded: boolean
  links: NavLink[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'command',
    label: 'Command',
    defaultExpanded: true,
    links: [
      { href: '/founder', label: 'Command Centre', icon: null, exact: true },
      { href: '/founder/briefing', label: 'Briefing', icon: null },
      { href: '/founder/approvals', label: 'Approvals', icon: CheckSquare },
      { href: '/founder/actions', label: 'Actions', icon: null }
    ]
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    defaultExpanded: true,
    links: [
      { href: '/founder/orb-evaluation', label: 'ORB Evaluation', icon: ShieldAlert },
      { href: '/founder/quality-lab', label: 'Quality Lab', icon: Beaker },
      { href: '/founder/learning-loop', label: 'Learning Loop', icon: Workflow },
      { href: '/founder/orb-quality-agent', label: 'ORB Quality Agent', icon: Bot },
      { href: '/founder/autonomy', label: 'Autonomy', icon: Timer },
      { href: '/founder/agents', label: 'Agents', icon: Bot },
      { href: '/founder/intelligence', label: 'Intelligence Centre', icon: Sparkles }
    ]
  },
  {
    id: 'business',
    label: 'Business',
    defaultExpanded: false,
    links: [
      { href: '/founder/revenue', label: 'Revenue', icon: PoundSterling },
      { href: '/founder/finance', label: 'Finance', icon: Wallet },
      { href: '/founder/relationships', label: 'Relationships', icon: Contact },
      { href: '/founder/orb-pilot', label: 'ORB Pilot', icon: ClipboardCheck }
    ]
  },
  {
    id: 'company',
    label: 'Company',
    defaultExpanded: false,
    links: [
      { href: '/founder/company', label: 'Company', icon: Building2 },
      { href: '/founder/team', label: 'Founder Team', icon: Users },
      { href: '/founder/evidence', label: 'Evidence', icon: FileCheck },
      { href: '/founder/audit', label: 'Audit Trail', icon: ScrollText },
      { href: '/founder/memory', label: 'Memory', icon: Brain },
      { href: '/founder/content', label: 'Content', icon: FileText },
      { href: '/founder/build-briefs', label: 'Build Briefs', icon: null },
      { href: '/founder/telemetry', label: 'Telemetry', icon: Radio },
      { href: '/founder/operating-loop', label: 'Operating Loop', icon: RefreshCw },
      { href: '/founder/orb', label: 'ORB Founder', icon: Bot }
    ]
  }
]

type FounderNavHeaderProps = {
  title: string
  subtitle?: string
  showBack?: boolean
  backHref?: string
}

function isLinkActive(pathname: string, link: NavLink): boolean {
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`)
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.links.some((link) => isLinkActive(pathname, link))
}

export function FounderNavHeader({ title, subtitle, showBack = false, backHref = '/founder' }: FounderNavHeaderProps) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, g.defaultExpanded]))
  )

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

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

      <nav className="mt-6 space-y-3" aria-label="Founder navigation" data-testid="founder-grouped-nav">
        {NAV_GROUPS.map((group) => {
          const expanded = expandedGroups[group.id] ?? group.defaultExpanded
          const groupActive = isGroupActive(pathname, group)

          return (
            <div
              key={group.id}
              className="rounded-xl border border-white/10 bg-black/20"
              data-testid={`founder-nav-group-${group.id}`}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold uppercase tracking-[0.14em] ${
                  groupActive ? 'text-cyan-200' : 'text-slate-400'
                }`}
                aria-expanded={expanded}
                data-testid={`founder-nav-group-toggle-${group.id}`}
              >
                {group.label}
                <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden />
              </button>

              {expanded ? (
                <div className="flex flex-wrap gap-2 border-t border-white/5 px-3 py-3">
                  {group.links.map((link) => {
                    const isActive = isLinkActive(pathname, link)
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
                        data-testid={`founder-nav-link-${link.href.replace(/\//g, '-').replace(/^-/, '')}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>
    </header>
  )
}

