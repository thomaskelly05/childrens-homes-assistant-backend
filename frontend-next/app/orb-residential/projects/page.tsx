'use client'

import { useEffect, useState } from 'react'

import { fetchOrbResidential } from '@/components/orb-residential/orb-residential-api'

type ProjectRow = { id: number; title: string; project_type: string }

export default function OrbResidentialProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([])

  useEffect(() => {
    fetchOrbResidential<{ data: ProjectRow[] }>('/orb/residential/projects')
      .then((payload) => setRows(payload.data || []))
      .catch(() => setRows([]))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Saved projects</h1>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm">
            <p className="font-medium">{row.title}</p>
            <p className="text-[#6B7280]">{row.project_type}</p>
          </li>
        ))}
        {!rows.length ? <p className="text-sm text-[#6B7280]">No projects yet.</p> : null}
      </ul>
    </div>
  )
}
