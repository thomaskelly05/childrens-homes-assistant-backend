'use client'

import { useEffect, useState } from 'react'

import { fetchOrbResidential } from '@/components/orb-residential/orb-residential-api'

type OutputRow = { id: number; title?: string; workflow: string; created_at: string }

export default function OrbResidentialOutputsPage() {
  const [rows, setRows] = useState<OutputRow[]>([])

  useEffect(() => {
    fetchOrbResidential<{ data: OutputRow[] }>('/orb/residential/outputs')
      .then((payload) => setRows(payload.data || []))
      .catch(() => setRows([]))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Saved outputs</h1>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm">
            <p className="font-medium">{row.title || row.workflow}</p>
            <p className="text-[#6B7280]">{row.created_at}</p>
          </li>
        ))}
        {!rows.length ? <p className="text-sm text-[#6B7280]">No saved outputs yet.</p> : null}
      </ul>
    </div>
  )
}
