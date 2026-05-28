'use client'

import { FormEvent, useState } from 'react'

import { fetchOrbResidential } from '@/components/orb-residential/orb-residential-api'

export default function OrbResidentialShiftBuilderPage() {
  const [notes, setNotes] = useState('')
  const [sections, setSections] = useState<Array<{ title: string; purpose: string }>>([])
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const payload = await fetchOrbResidential<{
        data: { sections?: Array<{ title: string; purpose: string }> }
      }>('/orb/residential/shift-builder', {
        method: 'POST',
        body: JSON.stringify({ notes, mode: 'full_shift_pack' }),
      })
      setSections(payload.data?.sections || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Shift Builder</h1>
      <p className="text-sm text-[#6B7280]">Paste shift notes only — ORB does not access live records.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          className="min-h-[180px] w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rough shift notes…"
        />
        <button type="submit" disabled={loading || !notes.trim()} className="rounded-full bg-[#111827] px-5 py-2 text-sm text-white">
          {loading ? 'Building…' : 'Build shift pack'}
        </button>
      </form>
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.title} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <h2 className="font-medium">{section.title}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">{section.purpose}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
