'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LogOut, Menu, Search, ShieldCheck, X } from 'lucide-react'

import { CommandSearch } from '@/components/indicare/command-search'
import { NotificationBell } from '@/components/connect/notification-bell'
import { MobileSafeButton } from '@/components/indicare/mobile/mobile-safe-button'
import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'
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

function safeNavHref(href: string) {
  return Boolean(href) && !href.includes('undefined') && !href.includes('null')
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
  }).filter((item) => safeNavHref(item.href))

  const workspaceLabel =
    scope.scope_type === 'child'
      ? `${scope.selected_child_name || activeChild?.preferredName || activeChild?.displayName || 'Child'} workspace`
      : scope.scope_type === 'home'
        ? `${scope.selected_home_name || 'Home'} workspace`
        : scopeTitle

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, closeMenu])

  return (
    <div data-testid="mobile-os-top-bar" className="relative z-50 min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <MobileSafeButton
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex min-w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm"
          aria-label="Open menu"
          data-testid="mobile-top-menu-clickable"
          tapDebugLabel="mobile-top-menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </MobileSafeButton>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-950" data-testid="mobile-os-scope-title">
            {workspaceLabel}
          </p>
        </div>

        <MobileSafeButton
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          className="inline-flex min-w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label={searchOpen ? 'Close search' : 'Open search'}
          aria-expanded={searchOpen}
          data-testid="mobile-top-search-clickable"
          tapDebugLabel="mobile-top-search"
        >
          <Search className="h-5 w-5" aria-hidden />
        </MobileSafeButton>

        {hasOsScope && scope.scope_type === 'child' ? (
          <div className="shrink-0 pointer-events-auto" data-testid="mobile-top-notifications-clickable">
            <NotificationBell />
          </div>
        ) : null}

        <MobileSafeLink
          prefetch={false}
          href="/select-scope"
          className="min-w-11 shrink-0 justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-800 shadow-sm"
          aria-label="Switch scope"
          data-testid="mobile-top-switch-scope-clickable"
          tapDebugLabel="mobile-top-switch-scope"
        >
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </MobileSafeLink>
      </div>

      {searchOpen && hasOsScope ? (
        <div className="relative z-50 min-w-0" data-testid="mobile-os-search-panel">
          <CommandSearch variant="compact" onNavigate={() => setSearchOpen(false)} />
        </div>
      ) : null}

      {menuOpen ? (
        <div
          className="mobile-menu-overlay pointer-events-auto fixed inset-0 z-[70] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
        >
          <MobileSafeButton
            type="button"
            className="mobile-menu-backdrop absolute inset-0 h-full w-full cursor-default rounded-none border-0 bg-slate-950/70 p-0 shadow-none"
            aria-label="Close menu"
            data-testid="mobile-drawer-backdrop"
            onClick={closeMenu}
            tapDebugLabel="mobile-drawer-backdrop"
          />
          <aside
            data-testid="mobile-drawer"
            className="mobile-menu-drawer pointer-events-auto absolute left-0 top-0 z-[1] flex h-full max-h-[100dvh] w-[min(86vw,360px)] flex-col overflow-y-auto overscroll-contain border-r border-white/10 bg-slate-950 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-2xl"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between gap-2 px-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">IndiCare OS</p>
              <MobileSafeButton
                type="button"
                onClick={closeMenu}
                className="inline-flex min-w-11 items-center justify-center rounded-xl bg-white/10 text-white"
                aria-label="Close menu"
                data-testid="mobile-menu-close"
                tapDebugLabel="mobile-menu-close"
              >
                <X className="h-5 w-5" aria-hidden />
              </MobileSafeButton>
            </div>
            <div className="px-4">
              <p className="mt-4 text-sm font-black text-white">{displayName(user)}</p>
              <p className="text-xs font-semibold text-slate-300">{labelForRole(user?.role)}</p>
              <p className="mt-2 text-xs font-bold text-blue-200">{workspaceLabel}</p>
            </div>
            <nav className="mt-5 min-h-0 flex-1 space-y-1 px-3" aria-label="Scope navigation">
              {scopeNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href.split('?')[0]}/`)
                return (
                  <MobileSafeLink
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    prefetch={item.prefetch ?? false}
                    onClick={closeMenu}
                    data-testid={item.testId}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-black ${
                      active ? 'bg-white text-slate-950' : 'text-slate-100 hover:bg-white/10'
                    }`}
                    tapDebugLabel={`mobile-drawer-${item.label}`}
                  >
                    <SafeLucideIcon icon={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </MobileSafeLink>
                )
              })}
            </nav>
            <div className="mt-3 space-y-2 px-3 pb-4">
              <MobileSafeLink
                prefetch={false}
                href={hasOsScope ? workspaceHrefForScope(scope) : '/select-scope'}
                onClick={closeMenu}
                className="w-full rounded-2xl bg-white/10 px-3 text-sm font-black text-white"
                tapDebugLabel="mobile-drawer-workspace-home"
              >
                Workspace home
              </MobileSafeLink>
              <MobileSafeLink
                prefetch={false}
                href="/select-scope"
                onClick={closeMenu}
                className="w-full rounded-2xl bg-white/10 px-3 text-sm font-black text-white"
                tapDebugLabel="mobile-drawer-switch-scope"
              >
                Switch scope
              </MobileSafeLink>
              <MobileSafeLink
                prefetch={false}
                href="/profile"
                onClick={closeMenu}
                className="w-full rounded-2xl bg-white/10 px-3 text-sm font-black text-white"
                tapDebugLabel="mobile-drawer-profile"
              >
                My profile
              </MobileSafeLink>
              <MobileSafeButton
                type="button"
                onClick={() => void logout()}
                data-testid="mobile-os-logout"
                className="flex w-full items-center gap-2 rounded-2xl border border-white/15 px-3 text-sm font-black text-white"
                tapDebugLabel="mobile-drawer-logout"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Log out
              </MobileSafeButton>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
