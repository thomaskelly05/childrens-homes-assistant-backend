'use client'

import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost'

const styles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 shadow-[0_0_32px_rgba(56,189,248,0.35)] hover:brightness-110',
  secondary:
    'border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
}

export function OrbButton({
  variant = 'primary',
  href,
  className,
  children,
  ...props
}: {
  variant?: Variant
  href?: string
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = clsx(
    'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-400/60',
    styles[variant],
    className
  )

  if (href) {
    return (
      <Link href={href} className={base} data-orb-button={variant}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={base} data-orb-button={variant} {...props}>
      {children}
    </button>
  )
}
