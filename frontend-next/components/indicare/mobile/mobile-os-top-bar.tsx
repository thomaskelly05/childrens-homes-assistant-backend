'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LogOut, Menu, Search, ShieldCheck, X } from 'lucide-react'

import { CommandSearch } from '@/components/indicare/command-search'
import { NotificationBell } from '@/components/connect/notification-bell'
import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { useAuth } from '@/contexts/auth-context'
import { displayName, roleLabels } from '@/lib/auth/permissions'
import { useActiveChild } from '@/lib/context/active-child-context'
import { workspaceHrefForScope } from '@/lib/os-scope'
import { scopeNavigationFor } from '@/lib/navigation/scope-navigation'
import { SafeLucideIcon } from '@/components/indicare/safe-lucide-icon'

function labelForRole(role: string | undefined) {
  return role && role in roleLabels ? roleLabels[role as keyof typeof roleLabels] : roleLabels.viewer
}

export function MobileOsTopBar({ scopeTitle }: { scopeTitle: string }) {
  const pathname = usePathname() || '/select-scope'
  const { scope } = useOsScope()
  const { user, logout } = useAuth()
  const { activeChild } = useActiveChild()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const hasOsScope = scope.scope_type === 'home' || scope.scope_type === 'child'
  const scopeNavItems = scopeNavigationFor(scope.scope_type, {
    homeId: scope.selected_home_id,
    childId: scope.selected_child_id
  })

  const workspaceLabel =
    scope.scope_type === 'child'
      ? `${scope.selected_child_name || activeChild?.preferredName || activeChild?.displayName || 'Child'} workspace`
      : scope.scope_type === 'home'
        ? `${scope.selected_home_name || 'Home'} workspace`
        : scopeTitle

  return (
    <div data-testid="mobile-os-top-bar" className="min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm"
          aria-label="Open menu"
          data-testid="mobile-os-menu-button"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-950" data-testid="mobile-os-scope-title">
            {workspaceLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label={searchOpen ? 'Close search' : 'Open search'}
          aria-expanded={searchOpen}
          data-testid="mobile-os-search-toggle"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>

        {hasOsScope && scope.scope_type === 'child' ? (
          <div className="shrink-0" data-testid="mobile-os-notifications">
            <NotificationBell />
          </div>
        ) : null}

        <Link
          prefetch={false}
          href="/select-scope"
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-800 shadow-sm"
          aria-label="Switch scope"
          data-testid="mobile-os-switch-scope"
        >
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      {searchOpen && hasOsScope ? (
        <div className="min-w-0" data-testid="mobile-os-search-panel">
          <CommandSearch variant="compact" onNavigate={() => setSearchOpen(false)} />
        </div>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile menu">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(100%,280px)] flex-col bg-slate-950 p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">IndiCare OS</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <p className="mt-4 text-sm font-black text-white">{displayName(user)}</p>
            <p className="text-xs font-semibold text-slate-400">{labelForRole(user?.role)}</p>
            <nav className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Scope navigation">
              {scopeNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href.split('?')[0]}/`)
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    prefetch={item.prefetch ?? false}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black ${
                      active ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <Link
              prefetch={false}
              href={hasOsScope ? workspaceHrefForScope(scope) : '/select-scope'}
              onClick={() => setMenuOpen(false)}
              className="mt-3 flex min-h-11 items-center rounded-2xl bg-white/10 px-3 text-sm font-black"
            >
              Workspace home
            </Link>
            <Link
              prefetch={false}
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="mt-2 flex min-h-11 items-center rounded-2xl bg-white/10 px-3 text-sm font-black"
            >
              My profile
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              data-testid="mobile-os-logout"
              className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-2xl border border-white/15 px-3 text-sm font-black"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
