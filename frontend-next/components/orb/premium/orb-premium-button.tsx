'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

import {
  cn,
  orbPremiumButtonClass,
  type OrbPremiumButtonVariant
} from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumButton({
  variant = 'primary',
  className,
  children,
  fullWidth,
  ...props
}: {
  variant?: OrbPremiumButtonVariant
  fullWidth?: boolean
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(orbPremiumButtonClass(variant), fullWidth && 'w-full', className)}
      data-orb-premium-button={variant}
      {...props}
    >
      {children}
    </button>
  )
}
