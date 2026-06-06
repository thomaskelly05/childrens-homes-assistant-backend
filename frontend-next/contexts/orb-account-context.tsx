'use client'

import { createContext, ReactNode, useContext } from 'react'

import { useOrbAccountStateInternal, type OrbAccountState } from '@/hooks/use-orb-account-state'
import type { OrbAccessPayload } from '@/lib/orb/orb-billing-client'

const OrbAccountStateContext = createContext<OrbAccountState | null>(null)

/** Single shared ORB account/access state — prevents duplicate access fetches across the tree. */
export function OrbAccountStateProvider({
  children,
  accessProbeEnabled = true,
  initialAccess = null
}: {
  children: ReactNode
  accessProbeEnabled?: boolean
  initialAccess?: OrbAccessPayload | null
}) {
  const value = useOrbAccountStateInternal({ accessProbeEnabled, initialAccess })
  return <OrbAccountStateContext.Provider value={value}>{children}</OrbAccountStateContext.Provider>
}

export function useOrbAccountState(): OrbAccountState {
  const context = useContext(OrbAccountStateContext)
  if (!context) {
    throw new Error('useOrbAccountState must be used within OrbAccountStateProvider')
  }
  return context
}
