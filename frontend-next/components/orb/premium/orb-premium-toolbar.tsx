'use client'

import { Search, X } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'

import { OrbPremiumInput } from '@/components/orb/premium/orb-premium-input'
import { cn } from '@/components/orb/premium/orb-premium-theme'
import { getOrbSearchSurface, ORB_SEARCH_DEFAULT_PLACEHOLDER } from '@/lib/orb/orb-search-registry'

export function OrbPremiumToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchSurfaceId,
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
  searchSurfaceId?: string
  onSearchSubmit?: () => void
  filters?: ReactNode
  actions?: ReactNode
  className?: string
  searchInputProps?: InputHTMLAttributes<HTMLInputElement>
  filtersDataAttr?: string
}) {
  const searchSurface = searchSurfaceId ? getOrbSearchSurface(searchSurfaceId) : undefined
  const resolvedPlaceholder =
    searchPlaceholder ?? searchSurface?.placeholder ?? ORB_SEARCH_DEFAULT_PLACEHOLDER
  const searchDataAttr = searchSurface?.dataAttr

  return (
    <div
      className={cn('orb-premium-toolbar space-y-3', className)}
      data-orb-premium-toolbar
      {...(searchSurfaceId ? { 'data-orb-search-surface': searchSurfaceId } : {})}
    >
      {onSearchChange !== undefined ? (
        <div className="orb-liquid-toolbar relative rounded-xl">
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
            placeholder={resolvedPlaceholder}
            aria-label={resolvedPlaceholder}
            className="border-0 bg-transparent py-2.5 pl-10 pr-10 shadow-none focus-visible:ring-0"
            data-orb-premium-search
            {...(searchDataAttr ? { [searchDataAttr]: true } : {})}
            {...searchInputProps}
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
              aria-label="Clear search"
              data-orb-search-clear
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
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
