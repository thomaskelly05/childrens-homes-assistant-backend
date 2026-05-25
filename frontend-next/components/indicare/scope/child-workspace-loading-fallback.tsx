'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'

const TIMEOUT_MS = 5000

type Props = {
  childId?: string
  reason?: string
  phase?: string
}

export function ChildWorkspaceLoadingFallback({ childId, reason, phase }: Props) {
  const [timedOut, setTimedOut] = useState(false)
  const directHref = childId ? childWorkspaceHref(childId) : '/select-scope'
  const showDevRoute = process.env.NODE_ENV === 'development' && childId

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [childId])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
      <div className="w-full max-w-lg rounded-[32px] border border-blue-100 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Preparing child workspace</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">
          {phase === 'blocked' ? 'Live child workspace returned 0 rows.' : 'Opening the selected child journey'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {reason || 'Checking child, session and role context before records load.'}
        </p>
        {showDevRoute ? (
          <p className="mt-2 text-xs font-bold text-slate-400">Route: {directHref}</p>
        ) : null}
        {timedOut ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <p className="text-sm font-bold text-amber-800 sm:basis-full">
              Workspace is taking longer than expected. Open child workspace directly.
            </p>
            <Link
              prefetch={false}
              href={directHref}
              data-testid="child-workspace-open-direct"
              className="inline-flex rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20"
            >
              Open child workspace directly
            </Link>
            <Link
              prefetch={false}
              href="/select-scope"
              data-testid="child-workspace-back-select-scope"
              className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20"
            >
              Back to select scope
            </Link>
          </div>
        ) : (
          <Link prefetch={false} href="/select-scope" className="mt-6 inline-flex rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
            Back to select scope
          </Link>
        )}
      </div>
    </div>
  )
}
