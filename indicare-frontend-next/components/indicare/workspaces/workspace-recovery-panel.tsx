'use client'

import Link from 'next/link'

export function WorkspaceRecoveryPanel({
  message,
  retryHref
}: {
  message: string
  retryHref?: string
}) {
  const isDbBusy = /database busy|pool|temporarily unavailable|retry shortly/i.test(message)

  return (
    <section
      data-testid="workspace-recovery-panel"
      className={`rounded-[32px] border p-8 shadow-[0_10px_32px_rgba(15,23,42,0.04)] ${
        isDbBusy ? 'border-amber-100 bg-amber-50/80' : 'border-red-100 bg-red-50/70'
      }`}
    >
      <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDbBusy ? 'text-amber-700' : 'text-red-500'}`}>
        {isDbBusy ? 'Operational load' : 'Operational issue'}
      </p>
      <h3 className={`mt-3 text-2xl font-black tracking-[-0.04em] ${isDbBusy ? 'text-amber-950' : 'text-red-900'}`}>
        Workspace recovery required
      </h3>
      <p className={`mt-4 max-w-2xl text-sm leading-7 ${isDbBusy ? 'text-amber-900' : 'text-red-800'}`}>
        {message}
      </p>
      {isDbBusy ? (
        <p className="mt-3 text-xs font-semibold text-amber-800">
          The system is protecting sign-in and core routes. Refresh in a moment or continue with read-only navigation.
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {retryHref ? (
          <Link
            href={retryHref}
            className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Try again
          </Link>
        ) : null}
        <Link href="/young-people" className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
          Choose child
        </Link>
        <Link href="/command-centre" className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
          Care Hub
        </Link>
      </div>
    </section>
  )
}
