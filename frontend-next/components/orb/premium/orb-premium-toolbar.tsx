'use client'

import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

import { OrbPremiumInput } from '@/components/orb/premium/orb-premium-input'
import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onSearchSubmit,
  filters,
  actions,
  className,
  searchInputProps,
  filtersDataAttr
}: {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  onSearchSubmit?: () => void
  filters?: ReactNode
  actions?: ReactNode
  className?: string
  searchInputProps?: React.InputHTMLAttributes<HTMLInputElement>
  filtersDataAttr?: string
}) {
  return (
    <div
      className={cn('orb-premium-toolbar space-y-3', className)}
      data-orb-premium-toolbar
    >
      {onSearchChange !== undefined ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--orb-muted)]"
            aria-hidden
          />
          <OrbPremiumInput
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearchSubmit?.()
            }}
            placeholder={searchPlaceholder}
            className="py-2.5 pl-10"
            data-orb-premium-search
            {...searchInputProps}
          />
        </div>
      ) : null}
      {filters ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          data-orb-premium-toolbar-filters
          {...(filtersDataAttr ? { [filtersDataAttr]: true } : {})}
        >
          {filters}
        </div>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
