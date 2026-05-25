'use client'

import { useEffect, useState } from 'react'

import { getInspectionPack, listInspectionPacks, type InspectionEvidencePack } from '@/lib/os-api/inspection-readiness'

type Props = {
  onOpenPack?: (pack: InspectionEvidencePack) => void
}

export function InspectionPackHistory({ onOpenPack }: Props) {
  const [packs, setPacks] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listInspectionPacks().then((result) => {
      if (!result.ok) {
        setError('Pack history unavailable — generate a pack to begin.')
        return
      }
      const data = result.data as { packs?: Array<Record<string, unknown>> }
      setPacks(data.packs || [])
    })
  }, [])

  return (
    <section id="history" data-testid="inspection-pack-history" className="space-y-3">
      <h3 className="text-sm font-black text-slate-950">Recent packs</h3>
      {error ? <p className="text-xs text-slate-500">{error}</p> : null}
      {!packs.length && !error ? (
        <p className="text-xs text-slate-500">No saved packs yet.</p>
      ) : (
        <ul className="space-y-2">
          {packs.map((row) => (
            <li key={String(row.id)}>
              <button
                type="button"
                className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left hover:border-blue-200"
                onClick={() => {
                  void getInspectionPack(String(row.id)).then((res) => {
                    if (res.ok && res.data && onOpenPack) onOpenPack(res.data as InspectionEvidencePack)
                  })
                }}
              >
                <span className="text-sm font-black text-slate-950">{String(row.title || row.id)}</span>
                <span className="mt-1 block text-[10px] font-semibold text-slate-500">
                  {String(row.pack_type)} · {String(row.evidence_count ?? 0)} evidence ·{' '}
                  {String(row.gap_count ?? 0)} gaps
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
