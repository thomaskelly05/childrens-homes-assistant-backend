import { AlertTriangle } from 'lucide-react'

import { safeOrbFailureCopy } from '@/lib/orb/errors/failure-copy'

export function OrbFailureState({ code }: { code: string }) {
  return (
    <div className="rounded-[28px] border border-amber-200/30 bg-amber-200/10 p-5 text-sm leading-6 text-amber-50">
      <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden />
      {safeOrbFailureCopy(code)}
    </div>
  )
}

