'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { orbStudioClass, orbStudioPrimaryActionClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioPrimaryAction({
  children,
  className,
  fullWidth,
  working,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
  working?: boolean
}) {
  return (
    <button
      type="button"
      className={orbStudioClass(
        orbStudioPrimaryActionClass,
        fullWidth ? 'w-full' : undefined,
        working ? 'orb-studio-state-working' : undefined,
        className
      )}
      data-orb-studio-primary-action
      data-orb-studio-working={working ? 'true' : undefined}
      {...props}
    >
      {children}
    </button>
  )
}
