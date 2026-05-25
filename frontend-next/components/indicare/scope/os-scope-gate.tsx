'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { HomeChildSelector } from '@/components/indicare/scope/home-child-selector'
import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import {
  isAlreadyOnScopedChildWorkspace,
  isChildWorkspacePath,
  routeRequiresScope,
  workspaceHrefForScope
} from '@/lib/os-scope'

export function OsScopeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const { scope, loading } = useOsScope()
  const lastRedirectRef = useRef<string | null>(null)

  const needsScope = routeRequiresScope(pathname)
  const hasScope = scope.scope_type === 'home' || scope.scope_type === 'child'
  const onScopedChildWorkspace =
    scope.scope_type === 'child' &&
    scope.selected_child_id != null &&
    isAlreadyOnScopedChildWorkspace(pathname, scope.selected_child_id)
  const childScopeMissingHome =
    scope.scope_type === 'child' && scope.selected_child_id != null && scope.selected_home_id == null

  useEffect(() => {
    if (loading || !needsScope) return
    if (onScopedChildWorkspace || isChildWorkspacePath(pathname)) return
    if (pathname === '/select-scope' && hasScope) {
      const target = workspaceHrefForScope(scope)
      if (!target || target === '/select-scope' || target === pathname) return
      if (lastRedirectRef.current === target) return
      lastRedirectRef.current = target
      router.replace(target)
    }
  }, [hasScope, loading, needsScope, onScopedChildWorkspace, pathname, router, scope])

  if (!needsScope) return <>{children}</>

  if (loading && !onScopedChildWorkspace && !isChildWorkspacePath(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6">
        <p className="text-sm font-black text-slate-600">Loading workspace scope…</p>
      </div>
    )
  }

  if (!hasScope) {
    return (
      <div data-testid="os-scope-gate" className="min-h-screen bg-[#f3f6fb] px-6 py-10">
        <HomeChildSelector />
      </div>
    )
  }

  if (childScopeMissingHome && isChildWorkspacePath(pathname)) {
    return (
      <div data-testid="os-scope-gate-child-home-warning" className="min-h-screen bg-[#f3f6fb] px-6 py-10">
        <div className="mx-auto max-w-lg rounded-[32px] border border-amber-100 bg-amber-50 p-6 text-center shadow-xl">
          <p className="text-sm font-black text-amber-900">Child scope is missing a home. Return to scope selection and choose the child again.</p>
          <HomeChildSelector />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
