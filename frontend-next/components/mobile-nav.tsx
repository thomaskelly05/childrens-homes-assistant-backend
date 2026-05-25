'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardPlus, Home, MessageSquarePlus } from 'lucide-react'

import { SafeLucideIcon } from '@/components/indicare/safe-lucide-icon'

import { childQuickActionHref, contextualChildQuickActions } from '@/lib/child-journey/workflows'
import { useAuth } from '@/contexts/auth-context'
import { useActiveChild } from '@/lib/context/active-child-context'
import { hrefForOperationalItem, isOperationalNavItemActive, visibleOperationalNavigation } from '@/lib/navigation/operational-navigation'

export function MobileNav() {
  const pathname = usePathname() || '/young-people'
  const { activeChild, childScopedHref } = useActiveChild()
  const { user } = useAuth()
  const childMatch = pathname.match(/^\/young-people\/([^/]+)/)
  const childId = childMatch?.[1] || activeChild?.id
  const items = childId
    ? visibleOperationalNavigation(user).filter((item) => ['command-centre', 'children', 'workforce', 'documents', 'orb'].includes(item.domain)).slice(0, 5)
    : [{ label: 'Choose', href: '/young-people', icon: Home, activeRoots: ['young-people'] }]
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
          return (
            <Link prefetch={false} key={item.label} href={item.href} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-white/95 px-3 py-2 text-[11px] font-black text-slate-700 shadow-lg shadow-slate-900/10 ring-1 ring-white/70">
              <SafeLucideIcon icon={item.icon} className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          )
        })}
      </div>
      <nav className="flex items-center justify-between rounded-[28px] bg-white/90 px-3 py-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)] ring-1 ring-white/70 backdrop-blur-xl">
        {items.map((item) => {
          const href = 'domain' in item ? hrefForOperationalItem(item, childId, childScopedHref) : item.href
          const active = 'domain' in item ? isOperationalNavItemActive(item, pathname) : pathname === item.href
          const icon = 'icon' in item ? item.icon : undefined
          return (
            <Link
              prefetch={false}
              key={`${item.label}-${item.href}`}
              href={href}
              className={active ? 'min-h-12 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white' : 'min-h-12 px-2 py-2 text-xs font-black text-slate-500'}
            >
              <SafeLucideIcon icon={icon} className="mx-auto h-4 w-4" />
              <span className="mt-1 block">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}