'use client'

import { ReactNode, Suspense } from 'react'

import { HydrationDiagnostic } from '@/components/indicare/debug/hydration-diagnostic'
import { InteractionHealthMarker } from '@/components/indicare/debug/interaction-health-marker'
import { AppShell } from '@/components/indicare/app-shell'
import { OsScopeGate } from '@/components/indicare/scope/os-scope-gate'
import { OsScopeProvider } from '@/components/indicare/scope/os-scope-provider'
import { ActiveChildProvider } from '@/lib/context/active-child-context'
import { OperationalContextProvider } from '@/lib/operational/operational-context'

function OsProvidersFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-900">
      <p className="text-sm font-bold text-slate-500">Loading workspace…</p>
    </div>
  )
}

/** Client boundary for scope-first layout — keeps app/layout.tsx a server component. */
export function OsAppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<OsProvidersFallback />}>
      <OsScopeProvider>
        <ActiveChildProvider>
          <OperationalContextProvider>
            <HydrationDiagnostic />
            <InteractionHealthMarker />
            <AppShell>
              <OsScopeGate>{children}</OsScopeGate>
            </AppShell>
          </OperationalContextProvider>
        </ActiveChildProvider>
      </OsScopeProvider>
    </Suspense>
  )
}
