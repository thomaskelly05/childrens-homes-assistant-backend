'use client'

import Link from 'next/link'

type OfficialSource = {
  id: string
  title: string
  url?: string | null
  note?: string | null
}

type Props = {
  sources: OfficialSource[]
}

export function SccifSourceNote({ sources }: Props) {
  return (
    <section
      data-testid="sccif-source-note"
      className="rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-4"
    >
      <h2 className="text-sm font-black text-slate-950">Official sources</h2>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        Evidence aligned to Ofsted SCCIF and the Children&apos;s Homes Quality Standards. Summary alignment
        only — import sources in Knowledge Library for exact citations.
      </p>
      <ul className="mt-3 space-y-2">
        {sources.map((source) => (
          <li key={source.id} className="text-xs">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-blue-800 underline"
              >
                {source.title}
              </a>
            ) : (
              <span className="font-black text-slate-800">{source.title}</span>
            )}
            {source.note ? <p className="mt-0.5 font-semibold text-slate-500">{source.note}</p> : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold text-slate-600">
        Import official SCCIF and Quality Standards sources in Knowledge Library for exact citations.
      </p>
      <Link
        href="/assistant/orb?mode=knowledge_library"
        className="mt-2 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 underline"
      >
        Knowledge Library route
      </Link>
    </section>
  )
}
