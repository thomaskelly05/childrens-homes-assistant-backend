'use client'

import type { TextareaHTMLAttributes } from 'react'

import { cn, orbPremiumTextareaClass } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(orbPremiumTextareaClass, className)} data-orb-premium-textarea {...props} />
  )
}
