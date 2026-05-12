'use client'

import { ErrorState } from '@/components/error-state'

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <ErrorState
          message={error.message || 'The operational workspace encountered an unexpected error.'}
        />
      </div>
    </main>
  )
}
