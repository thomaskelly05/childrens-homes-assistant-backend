'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import type { OrbContext } from '@/lib/orb/types'

function orbChatHref(context: OrbContext) {
  const q = new URLSearchParams()
  const childLock = (context.child_context_lock || {}) as { active?: boolean; child_id?: string | number; young_person_id?: string | number }
  const homeId = (context as Record<string, unknown>).home_id || (context as Record<string, unknown>).homeId
  const childId = childLock.child_id || childLock.young_person_id || (context as Record<string, unknown>).child_id || (context as Record<string, unknown>).young_person_id

  if (childId) {
    q.set('scope', 'child')
    q.set('young_person_id', String(childId))
  } else if (homeId) {
    q.set('scope', 'home')
    q.set('home_id', String(homeId))
  }

  const qs = q.toString()
  return qs ? `/assistant/orb?${qs}` : '/assistant/orb'
}

export function OrbButton({ context, placement = 'floating' }: { context: OrbContext; role?: string | null; placement?: 'floating' | 'inline' }) {
  const { status, user, csrfReady } = useAuth()
  const orbReady = status === 'authenticated' && Boolean(user) && csrfReady
  const authMessage = status === 'unauthenticated' ? 'Your session expired. Sign in again to use ORB.' : 'ORB is waiting for your secure session.'
  const href = orbChatHref(context)

  const className = `orb-embedded-dock pointer-events-auto group relative inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${placement === 'inline' ? '' : 'min-h-12 md:min-h-14'}`

  return (
    <div
      data-orb-floating-dock={placement === 'floating' ? 'true' : undefined}
      className={placement === 'floating' ? 'orb-floating-dock pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-50 md:bottom-7 md:right-7' : 'relative inline-flex'}
    >
      {orbReady ? (
        <Link
          href={href}
          data-testid={placement === 'floating' ? 'orb-button' : 'orb-button-inline'}
          className={className}
          aria-label="Open ORB chat"
          title="Ask ORB"
        >
          <span className="absolute inset-0 rounded-full bg-cyan-300/20 blur-xl transition group-hover:bg-cyan-200/30" aria-hidden />
          <Sparkles className="relative h-5 w-5" aria-hidden />
          <span className="relative hidden md:inline">Ask ORB</span>
          <span className="sr-only">Open ORB chat</span>
        </Link>
      ) : (
        <button
          type="button"
          data-testid={placement === 'floating' ? 'orb-button' : 'orb-button-inline'}
          className={className}
          disabled
          aria-label={authMessage}
          title={authMessage}
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          <span className="hidden md:inline">Ask ORB</span>
        </button>
      )}
    </div>
  )
}
