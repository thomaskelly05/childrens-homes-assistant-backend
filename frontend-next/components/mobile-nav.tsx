'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardPlus, Clock3, FileText, Home, MessageSquarePlus, ShieldAlert } from 'lucide-react'

import { childOperationalQuickActions, childQuickActionHref } from '@/lib/child-journey/workflows'
import { useActiveChild } from '@/lib/context/active-child-context'

export function MobileNav() {
  const pathname = usePathname() || '/home'
  const { activeChild, childScopedHref } = useActiveChild()
  const childMatch = pathname.match(/^\/young-people\/([^/]+)/)
  const childId = childMatch?.[1] || activeChild?.id
  const items = [
    { label: 'Children', href: '/home', icon: Home },
    { label: 'Shift', href: '/shifts/current', icon: Clock3 },
    { label: 'Records', href: childScopedHref('/chronology'), icon: FileText },
    { label: 'Alerts', href: childScopedHref('/safeguarding'), icon: ShieldAlert },
    { label: 'Assistant', href: '/assistant', icon: MessageSquarePlus }
  ]
  const quickActions = childId
    ? childOperationalQuickActions.map((action) => ({
        label: action.label,
        href: childQuickActionHref(childId, action),
        icon: action.id === 'safeguarding' ? ShieldAlert : ClipboardPlus
      }))
    : [
        { label: 'Choose child', href: '/home', icon: ClipboardPlus },
        { label: 'Actions', href: '/home', icon: ShieldAlert },
        { label: 'Assistant', href: '/assistant', icon: MessageSquarePlus }
      ]

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-50 w-[calc(100%-24px)] max-w-md -translate-x-1/2 lg:hidden">
      <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {quickActions.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.label} href={item.href} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-white/70 bg-white/95 px-3 py-2 text-[11px] font-black text-slate-700 shadow-lg shadow-slate-900/10">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </div>
      <nav className="flex items-center justify-between rounded-[28px] border border-white/70 bg-white/90 px-3 py-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
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
