import type { OsApiResult } from '@/lib/os-api/types'

export function LiveDataStatus({ result }: { result: Pick<OsApiResult<unknown>, 'source' | 'warning' | 'error'> }) {
  if (!result.warning && result.source === 'live') return null

  return (
    <section className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-4 text-sm leading-6 text-amber-900">
      <strong className="block font-black">{result.source === 'live' ? 'Live data issue' : 'Demo fallback visible'}</strong>
      <span>{result.warning || 'This view is using demo OS data.'}</span>
      {result.error ? <span className="mt-1 block text-xs font-bold">Backend detail: {result.error}</span> : null}
    </section>
  )
}

