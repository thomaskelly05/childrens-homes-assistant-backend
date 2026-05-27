'use client'

import { usePathname } from 'next/navigation'

import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'

export type MobileScopeTab = {
  label: string
  href: string
  testId?: string
}

export function MobileScopeHeader({ items }: { items: MobileScopeTab[] }) {
  const pathname = usePathname() || '/'

  if (!items.length) return null

  return (
    <nav
      data-testid="mobile-scope-tabs"
      className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory]"
      aria-label="Workspace sections"
    >
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/young-people' && pathname.startsWith(item.href.split('?')[0]))
        return (
          <MobileSafeLink
            prefetch={false}
            key={`${item.label}-${item.href}`}
            href={item.href}
            data-testid={item.testId}
            tapDebugLabel={`mobile-scope-tab-${item.label}`}
            className={`min-h-11 shrink-0 snap-start rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-[0.1em] transition ${
              active ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {item.label}
          </MobileSafeLink>
        )
      })}
    </nav>
  )
}
