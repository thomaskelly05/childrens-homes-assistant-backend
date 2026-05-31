import Link from 'next/link'
import type { ReactNode } from 'react'

import { clsx } from 'clsx'

export function OrbAuthButton({
  href,
  disabled,
  children,
  provider,
  className
}: {
  href?: string
  disabled?: boolean
  children: ReactNode
  provider?: string
  className?: string
}) {
  const base = clsx(
    'flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition',
    disabled
      ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-500'
      : 'border-white/12 bg-white/[0.05] text-white hover:border-sky-400/30 hover:bg-white/[0.08]',
    className
  )

  if (disabled || !href) {
    return (
      <span className={base} data-orb-oauth={provider} aria-disabled>
        {children}
      </span>
    )
  }

  return (
    <Link href={href} className={base} data-orb-oauth={provider}>
      {children}
    </Link>
  )
}
