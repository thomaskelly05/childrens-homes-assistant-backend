'use client'

import { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { HomeChildSelector } from '@/components/indicare/scope/home-child-selector'
import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { routeRequiresScope, workspaceHrefForScope } from '@/lib/os-scope'

export function OsScopeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const { scope, loading } = useOsScope()

  const needsScope = routeRequiresScope(pathname)
  const hasScope = scope.scope_type === 'home' || scope.scope_type === 'child'

  useEffect(() => {
    if (loading || !needsScope || !hasScope) return
    if (pathname === '/select-scope') {
      router.replace(workspaceHrefForScope(scope))
    }
  }, [hasScope, loading, needsScope, pathname, router, scope])

  if (!needsScope) return <>{children}</>

  if (loading) {
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

  return <>{children}</>
}
