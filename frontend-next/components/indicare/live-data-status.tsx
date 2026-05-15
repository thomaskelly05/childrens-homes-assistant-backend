import type { OsApiResult } from '@/lib/os-api/types'

export function LiveDataStatus({ result }: { result: Pick<OsApiResult<unknown>, 'source' | 'warning' | 'error'> }) {
  if (!result.warning && result.source === 'live') return null

  return (
    <section className="rounded-[24px] border border-blue-100 bg-blue-50/80 p-4 text-sm leading-6 text-blue-950">
      <strong className="block font-black">{result.source === 'live' ? 'Live data issue' : 'No records found yet.'}</strong>
      <span>{result.warning || 'No records found yet.'}</span>
      {process.env.NODE_ENV === 'development' && result.error ? <span className="mt-1 block text-xs font-bold">Developer detail: {result.error}</span> : null}
    </section>
  )
}

