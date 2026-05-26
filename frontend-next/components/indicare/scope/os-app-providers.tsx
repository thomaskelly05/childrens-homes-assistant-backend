'use client'

import { ReactNode } from 'react'

import { InteractionHealthMarker } from '@/components/indicare/debug/interaction-health-marker'
import { AppShell } from '@/components/indicare/app-shell'
import { OsScopeGate } from '@/components/indicare/scope/os-scope-gate'
import { OsScopeProvider } from '@/components/indicare/scope/os-scope-provider'
import { ActiveChildProvider } from '@/lib/context/active-child-context'
import { OperationalContextProvider } from '@/lib/operational/operational-context'

/** Client boundary for scope-first layout — keeps app/layout.tsx a server component. */
export function OsAppProviders({ children }: { children: ReactNode }) {
  return (
    <OsScopeProvider>
      <ActiveChildProvider>
        <OperationalContextProvider>
          <InteractionHealthMarker />
          <AppShell>
            <OsScopeGate>{children}</OsScopeGate>
          </AppShell>
        </OperationalContextProvider>
      </ActiveChildProvider>
    </OsScopeProvider>
  )
}
