'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardPlus, Home, MessageSquarePlus } from 'lucide-react'

import { SafeLucideIcon } from '@/components/indicare/safe-lucide-icon'
import { useOsScope } from '@/components/indicare/scope/os-scope-provider'

import { childQuickActionHref, contextualChildQuickActions } from '@/lib/child-journey/workflows'
import { scopeNavigationFor } from '@/lib/navigation/scope-navigation'

export function MobileNav() {
  const pathname = usePathname() || '/select-scope'
  const { scope } = useOsScope()
  const hasScope = scope.scope_type === 'home' || scope.scope_type === 'child'
  const childId = scope.selected_child_id ? String(scope.selected_child_id) : undefined
  const scopeItems = scopeNavigationFor(scope.scope_type, {
    homeId: scope.selected_home_id,
    childId: scope.selected_child_id
  }).slice(0, 5)
  const items = hasScope
    ? scopeItems
    : [{ label: 'Choose', href: '/select-scope', icon: Home }]
  const quickActions =
    scope.scope_type === 'child' && childId
      ? contextualChildQuickActions({ workflow: 'mobile' }).map((action) => ({
          label: action.label,
          href: childQuickActionHref(childId, action),
          icon: action.id === 'dictate-orb' ? MessageSquarePlus : ClipboardPlus
        }))
      : [{ label: 'Choose scope', href: '/select-scope', icon: ClipboardPlus }]

  return (
    <div data-testid="mobile-scope-nav" className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-50 w-[calc(100%-24px)] max-w-md -translate-x-1/2 lg:hidden">
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
          const active = pathname === item.href || pathname.startsWith(`${item.href.split('?')[0]}/`)
          return (
            <Link
              prefetch={item.prefetch ?? false}
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={active ? 'min-h-12 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white' : 'min-h-12 px-2 py-2 text-xs font-black text-slate-500'}
            >
              <SafeLucideIcon icon={item.icon} className="mx-auto h-4 w-4" />
              <span className="mt-1 block">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
