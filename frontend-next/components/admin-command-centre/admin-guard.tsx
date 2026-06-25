'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { userHasAdminCommandCentreAccessFromProfile } from '@/lib/founder/access'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const allowed = userHasAdminCommandCentreAccessFromProfile(user)
  const returnTarget = pathname?.startsWith('/admin') ? pathname : '/admin'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/orb?returnUrl=${encodeURIComponent(returnTarget)}`)
    }
  }, [router, status, returnTarget])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070d] text-slate-300">
        <p className="text-sm font-semibold">Verifying admin access…</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070d] px-6">
        <div className="max-w-lg rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10">
            <ShieldAlert className="h-7 w-7 text-rose-300" aria-hidden />
          </div>
          <h1 className="mt-5 text-2xl font-black text-white">Access denied</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The Admin Command Centre is restricted to authorised founders and administrators. Normal ORB users
            cannot access this operational console.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
