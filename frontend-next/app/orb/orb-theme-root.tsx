'use client'

import type { ReactNode } from 'react'

import { OrbAppearanceProvider } from '@/components/orb-standalone/orb-appearance-provider'

/** Shared appearance state for all `/orb` routes — one theme writer for the whole tree. */
export function OrbResidentialThemeRoot({ children }: { children: ReactNode }) {
  return <OrbAppearanceProvider residential>{children}</OrbAppearanceProvider>
}
