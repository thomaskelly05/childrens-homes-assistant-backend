'use client'

import Link from 'next/link'
import { type ComponentProps, type MouseEvent, useCallback } from 'react'

import { logTapTarget } from '@/lib/interaction/mobile-tap-debug'

type MobileSafeLinkProps = ComponentProps<typeof Link> & {
  tapDebugLabel?: string
  'data-testid'?: string
}

/**
 * Next.js Link with iOS-friendly tap targets and optional dev tap logging.
 */
export function MobileSafeLink({
  tapDebugLabel,
  onClick,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  ...props
}: MobileSafeLinkProps) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      logTapTarget(event, tapDebugLabel || ariaLabel || dataTestId)
      onClick?.(event)
    },
    [onClick, ariaLabel, dataTestId, tapDebugLabel]
  )

  return (
    <Link
      {...props}
      onClick={handleClick}
      className={`pointer-events-auto inline-flex min-h-11 cursor-pointer touch-manipulation items-center ${className}`.trim()}
    />
  )
}
