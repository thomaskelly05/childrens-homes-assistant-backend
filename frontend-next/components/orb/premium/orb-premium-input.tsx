'use client'

import type { InputHTMLAttributes } from 'react'

import { cn, orbPremiumInputClass } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(orbPremiumInputClass, className)} data-orb-premium-input {...props} />
}
