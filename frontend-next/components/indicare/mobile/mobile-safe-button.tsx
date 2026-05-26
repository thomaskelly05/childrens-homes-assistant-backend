'use client'

import { type ButtonHTMLAttributes, type MouseEvent, useCallback, useRef } from 'react'

import { logTapTarget } from '@/lib/interaction/mobile-tap-debug'

type MobileSafeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tapDebugLabel?: string
  'data-testid'?: string
}

/**
 * Button with iOS-friendly tap target sizing and optional dev tap logging.
 */
export function MobileSafeButton({
  tapDebugLabel,
  onClick,
  className = '',
  type = 'button',
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  ...props
}: MobileSafeButtonProps) {
  const clickGuardRef = useRef(false)

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      logTapTarget(event, tapDebugLabel || ariaLabel || dataTestId)
      if (clickGuardRef.current) return
      clickGuardRef.current = true
      try {
        onClick?.(event)
      } finally {
        window.setTimeout(() => {
          clickGuardRef.current = false
        }, 400)
      }
    },
    [onClick, ariaLabel, dataTestId, tapDebugLabel]
  )

  return (
    <button
      type={type}
      {...props}
      onClick={handleClick}
      className={`pointer-events-auto min-h-11 cursor-pointer touch-manipulation ${className}`.trim()}
    />
  )
}
