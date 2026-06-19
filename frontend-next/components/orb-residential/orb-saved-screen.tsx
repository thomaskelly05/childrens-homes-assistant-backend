'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search, Trash2 } from 'lucide-react'

import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { ORB_NAV_RECORDS, ORB_RECORDS_EMPTY_TITLE, ORB_RECORDS_FILTER_CHIPS } from '@/lib/orb/orb-user-facing-names'
import {
  deleteOrbSavedOutput,
  listOrbSavedOutputs,
  type OrbSavedOutputSummary
} from '@/lib/orb/standalone-client'

export function OrbSavedScreen() {
  const [items, setItems] = useState<OrbSavedOutputSummary[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listOrbSavedOutputs({
        search: search.trim() || undefined,
        output_type: typeFilter || undefined
      })
      setItems(result.items ?? [])
    } catch {
      setError('Could not load records and drafts. Sign in to ORB.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleDelete(id: string) {
    try {
      await deleteOrbSavedOutput(id)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch {
      setError('Delete failed.')
    }
  }

  return (
    <OrbShell>
      <div className="py-6" data-orb-saved>
        <Link href="/orb" className="text-xs text-slate-500 hover:text-sky-300">
          ← ORB home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-white">{ORB_NAV_RECORDS}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Records and drafts saved from Chat, Dictate and Voice — for adult review before use.
        </p>

        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void refresh()}
              placeholder="Search saved work…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-10 pr-4 text-white"
              data-orb-saved-outputs-search
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" data-orb-saved-outputs-filters>
          {ORB_RECORDS_FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setTypeFilter(chip.type)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                typeFilter === chip.type ? 'bg-sky-500/30 text-white' : 'bg-white/[0.06] text-slate-400'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        {loading ? (
          <Loader2 className="mt-8 h-6 w-6 animate-spin text-sky-400" />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <OrbGlassCard key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.type}</p>
                    {item.summary ? <p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.summary}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-red-400"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  href={`/orb/ask?saved=${encodeURIComponent(item.id)}`}
                  className="mt-4 inline-block text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  Open →
                </Link>
              </OrbGlassCard>
            ))}
            {!items.length ? (
              <p className="text-sm text-slate-500" data-orb-saved-outputs-empty>
                {ORB_RECORDS_EMPTY_TITLE}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </OrbShell>
  )
}
