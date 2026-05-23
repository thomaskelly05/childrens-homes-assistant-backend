'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { Mic2, Sparkles } from 'lucide-react'

import {
  RECORDING_ORB_COPY_PROMPT,
  RECORDING_OS_ORB_HREF,
  RECORDING_STANDALONE_ORB_HREF
} from '@/lib/record/recording-quality-coach'

const SUGGESTED_PROMPTS = [
  'What should I include in this record?',
  'Make this wording more child-centred.',
  'Does this need manager review?',
  'Help me include the child’s voice.',
  'Check this for judgemental language.',
  'What follow-up should be recorded?'
] as const

export function RecordingOrbRail() {
  const copyOrbPrompt = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(RECORDING_ORB_COPY_PROMPT)
  }, [])

  return (
    <aside data-testid="recording-orb-rail" className="space-y-4">
      <section className="rounded-2xl border border-cyan-100 bg-gradient-to-b from-cyan-50/90 to-white p-4 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-800">ORB recording coach</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">ORB can help you think before you save.</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
          ORB supports recording quality. Adults remain responsible for the final record.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Suggested prompts</p>
        <ul className="mt-2 space-y-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <li key={prompt} className="text-sm font-semibold leading-5 text-slate-700">
              {prompt}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        <Link
          href={RECORDING_OS_ORB_HREF}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Open OS ORB
        </Link>
        <Link
          href={RECORDING_STANDALONE_ORB_HREF}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
        >
          <Mic2 className="h-4 w-4 text-blue-600" aria-hidden />
          Standalone wording helper
        </Link>
        <button
          type="button"
          onClick={() => void copyOrbPrompt()}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-900"
        >
          Copy prompt for ORB
        </button>
      </div>
    </aside>
  )
}
