'use client'

import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react'

import type { OrbTranscriptEntry } from '@/lib/orb/types'

export function OrbTranscript({ transcript, partialTranscript }: { transcript: OrbTranscriptEntry[]; partialTranscript?: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Live transcript</p>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">Captions on</span>
      </div>
      <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-1" aria-live="polite">
        {transcript.filter((entry) => entry.role !== 'system').map((entry) => (
          <article
            key={entry.id}
            className={`rounded-2xl p-4 text-sm leading-6 ${
              entry.role === 'assistant' ? 'bg-blue-50 text-slate-800' : 'bg-slate-50 text-slate-700'
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
              <span className={entry.role === 'assistant' ? 'text-blue-700' : 'text-slate-500'}>{entry.role === 'assistant' ? 'Orb' : 'You'}</span>
              {entry.interrupted ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                  <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                  Interrupted
                </span>
              ) : null}
              {entry.draft ? (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-purple-700">
                  <FileText className="mr-1 h-3 w-3" aria-hidden />
                  Draft pending
                </span>
              ) : null}
              {entry.tools_used?.length ? (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                  {entry.tools_used.length} tool(s)
                </span>
              ) : null}
              {entry.citations.length ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                  {entry.citations.length} citation(s)
                </span>
              ) : null}
            </div>
            <div className="whitespace-pre-wrap">{entry.content}</div>
          </article>
        ))}
        {partialTranscript ? (
          <article className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4 text-sm leading-6 text-blue-900">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Listening</p>
            {partialTranscript}
          </article>
        ) : null}
        {!transcript.length && !partialTranscript ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-500">
            Orb transcript will appear here. Raw audio is not stored by default.
          </div>
        ) : null}
      </div>
    </div>
  )
}

