'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import {
  findOrbDictateMatches,
  replaceOrbDictateAll,
  type OrbDictateFindMatch
} from '@/lib/orb/dictate/orb-dictate-find-replace'

export function OrbDictateFindReplacePanel({
  documentText,
  onApplyText
}: {
  documentText: string
  onApplyText: (text: string, label: string) => void
}) {
  const [findQuery, setFindQuery] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [protectQuotes, setProtectQuotes] = useState(true)
  const [activeMatch, setActiveMatch] = useState(0)

  const matches = useMemo(
    () =>
      findOrbDictateMatches(documentText, findQuery, {
        matchCase,
        protectDirectQuotes: protectQuotes
      }),
    [documentText, findQuery, matchCase, protectQuotes]
  )

  const current: OrbDictateFindMatch | undefined = matches[activeMatch]

  function applyReplaceAll() {
    if (!findQuery.trim()) return
    if (protectQuotes && findOrbDictateMatches(documentText, findQuery, { matchCase }).some((m) => false)) {
      const confirmed = window.confirm(
        'Direct quote protection is on. Some matches inside quotes may be skipped. Continue with replace all?'
      )
      if (!confirmed) return
    }
    const result = replaceOrbDictateAll(documentText, findQuery, replaceWith, {
      matchCase,
      protectDirectQuotes: protectQuotes
    })
    onApplyText(result.text, `Find/replace (${result.replaced} changes)`)
  }

  return (
    <div
      className="rounded-xl border border-[var(--orb-line)]/40 bg-black/20 p-3"
      data-orb-dictate-find-replace
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
        <Search className="h-3.5 w-3.5" />
        Find / replace
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          data-orb-dictate-find-input
          value={findQuery}
          onChange={(e) => {
            setFindQuery(e.target.value)
            setActiveMatch(0)
          }}
          placeholder="Find…"
          className="rounded-lg border border-[var(--orb-line)]/50 bg-black/30 px-2 py-1.5 text-xs text-white"
        />
        <input
          data-orb-dictate-replace-input
          value={replaceWith}
          onChange={(e) => setReplaceWith(e.target.value)}
          placeholder="Replace with…"
          className="rounded-lg border border-[var(--orb-line)]/50 bg-black/30 px-2 py-1.5 text-xs text-white"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
          Match case
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={protectQuotes} onChange={(e) => setProtectQuotes(e.target.checked)} />
          Protect direct quotes
        </label>
        <span data-orb-dictate-find-count>
          {matches.length} match{matches.length === 1 ? '' : 'es'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          data-orb-dictate-replace-all
          className="rounded-lg border border-sky-400/30 bg-sky-500/15 px-2.5 py-1 text-[10px] text-sky-100"
          onClick={applyReplaceAll}
          disabled={!findQuery.trim() || !matches.length}
        >
          Replace all
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--orb-line)]/50 px-2.5 py-1 text-[10px] text-slate-300"
          disabled={!matches.length}
          onClick={() => setActiveMatch((i) => (i + 1) % matches.length)}
        >
          Next match
        </button>
      </div>
      {current ? (
        <p className="mt-2 text-[10px] text-slate-500">
          Active match at character {current.index + 1}
        </p>
      ) : null}
    </div>
  )
}
