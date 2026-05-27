'use client'

import { ClipboardList, type LucideIcon } from 'lucide-react'

const FALLBACK_ICON: LucideIcon = ClipboardList

export function SafeLucideIcon({
  icon,
  className,
  'aria-hidden': ariaHidden = true
}: {
  icon: LucideIcon | undefined | null
  className?: string
  'aria-hidden'?: boolean
}) {
  const Icon = icon && typeof icon === 'function' ? icon : FALLBACK_ICON
  return <Icon className={className} aria-hidden={ariaHidden} />
}
