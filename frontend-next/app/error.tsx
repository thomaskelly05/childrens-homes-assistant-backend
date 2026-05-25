'use client'

import { WorkspaceRecoveryPanel } from '@/components/indicare/workspaces/workspace-recovery-panel'

export default function Error({ error }: { error: Error & { digest?: string } }) {
  const message = error.message || 'The operational workspace encountered an unexpected error.'
  const isElementTypeError = /element type is invalid|react error #130/i.test(message)

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <WorkspaceRecoveryPanel
          message={
            isElementTypeError
              ? 'A workspace section could not render safely. The interface has switched to recovery mode instead of crashing.'
              : message
          }
        />
      </div>
    </main>
  )
}
