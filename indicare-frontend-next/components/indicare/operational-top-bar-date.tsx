'use client'

import { ClientOnly } from '@/components/indicare/client-only'

function formatOperationalDate() {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(new Date())
}

const placeholderClass =
  'inline-block min-w-[7.5rem] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-transparent shadow-sm select-none'

export function OperationalTopBarDate() {
  return (
    <ClientOnly
      fallback={<span className={placeholderClass} aria-hidden>&nbsp;</span>}
    >
      <div
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm xl:block"
        data-testid="operational-top-bar-date"
        suppressHydrationWarning
      >
        {formatOperationalDate()}
      </div>
    </ClientOnly>
  )
}
