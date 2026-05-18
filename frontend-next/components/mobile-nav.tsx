'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ClipboardPlus, FileText, Home, MessageSquarePlus, ShieldAlert, UserRound } from 'lucide-react'

import { childQuickActionHref, contextualChildQuickActions } from '@/lib/child-journey/workflows'
import { useActiveChild } from '@/lib/context/active-child-context'

export function MobileNav() {
  const pathname = usePathname() || '/young-people'
  const { activeChild, childScopedHref } = useActiveChild()
  const childMatch = pathname.match(/^\/young-people\/([^/]+)/)
  const childId = childMatch?.[1] || activeChild?.id
  const items = childId ? [
    { label: 'People', href: `/young-people/${encodeURIComponent(childId)}/journey`, icon: UserRound },
    { label: 'Story', href: `/young-people/${encodeURIComponent(childId)}/daily-note/new`, icon: ClipboardPlus },
    { label: 'Events', href: `/young-people/${encodeURIComponent(childId)}/chronology`, icon: FileText },
    { label: 'Safe', href: `/safeguarding?young_person_id=${encodeURIComponent(childId)}`, icon: ShieldAlert },
    { label: 'ORB', href: '/assistant', icon: MessageSquarePlus },
    { label: 'Alerts', href: '/notifications', icon: Bell }
  ] : [
    { label: 'Choose', href: '/young-people', icon: Home },
    { label: 'Children', href: '/young-people', icon: UserRound }
  ]
  const quickActions = childId
    ? contextualChildQuickActions({ workflow: 'mobile' }).map((action) => ({
        label: action.label,
        href: childQuickActionHref(childId, action),
        icon: action.id === 'dictate-orb' ? MessageSquarePlus : ClipboardPlus
      }))
    : [
        { label: 'Choose child', href: '/young-people', icon: ClipboardPlus }
      ]

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-50 w-[calc(100%-24px)] max-w-md -translate-x-1/2 lg:hidden">
      <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {quickActions.map((item) => {
          const Icon = item.icon
          return (
            <Link prefetch={false} key={item.label} href={item.href} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-white/95 px-3 py-2 text-[11px] font-black text-slate-700 shadow-lg shadow-slate-900/10 ring-1 ring-white/70">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </div>
      <nav className="flex items-center justify-between rounded-[28px] bg-white/90 px-3 py-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)] ring-1 ring-white/70 backdrop-blur-xl">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/young-people' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              prefetch={false}
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={active ? 'min-h-12 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white' : 'min-h-12 px-2 py-2 text-xs font-black text-slate-500'}
            >
              <Icon className="mx-auto h-4 w-4" aria-hidden />
              <span className="mt-1 block">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}