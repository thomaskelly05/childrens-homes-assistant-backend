import { Suspense } from 'react'

import { RecordingAlertsPage } from '@/components/indicare/record/recording-alerts-page'

export const metadata = {
  title: 'Recording alerts | IndiCare OS'
}

export default function RecordAlertsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6" data-testid="record-alerts-route">
      <Suspense fallback={<p className="text-sm font-semibold text-slate-600">Loading recording alerts…</p>}>
        <RecordingAlertsPage />
      </Suspense>
    </main>
  )
}
