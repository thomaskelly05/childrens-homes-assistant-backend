import { Suspense } from 'react'

import { ActionsScopedPage } from '@/components/indicare/actions-scoped-page'
import { getOsActions } from '@/lib/os-api/actions'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function ActionsPage() {
  const [actionsResult, chronologyResult] = await Promise.all([getOsActions(), getOsChronology()])

  return (
    <Suspense fallback={<p className="p-8 text-sm font-semibold text-slate-600">Loading actions…</p>}>
      <ActionsScopedPage actionsResult={actionsResult} chronologyResult={chronologyResult} />
    </Suspense>
  )
}
