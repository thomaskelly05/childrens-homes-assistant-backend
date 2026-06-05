'use client'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export type OrbPremiumTabItem<T extends string = string> = {
  id: T
  label: string
}

export function OrbPremiumTabs<T extends string>({
  tabs,
  activeId,
  onChange,
  ariaLabel,
  className,
  ...props
}: {
  tabs: readonly OrbPremiumTabItem<T>[]
  activeId: T
  onChange: (id: T) => void
  ariaLabel: string
  className?: string
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  return (
    <div
      className={cn(
        'orb-premium-tabs flex flex-wrap gap-1 rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 p-1',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
      data-orb-premium-tabs
      {...props}
    >
      {tabs.map((tab) => {
        const active = activeId === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm',
              active
                ? 'bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)] shadow-sm'
                : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
            )}
            data-orb-premium-tab={tab.id}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
