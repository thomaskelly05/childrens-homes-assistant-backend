'use client'

import { useMemo, useState } from 'react'
import { Mic, Plus, RotateCcw, Save, Sparkles, WifiOff } from 'lucide-react'

import { rapidRecordingTypes } from '@/lib/operations/shift-data'

const recentPhrases = [
  'Presented as settled and engaged with routine.',
  'Welfare check completed; no immediate concerns observed.',
  'Evidence suggests manager review is required before closure.',
  'Follow-up action added for next shift handover.'
]

export function RapidRecordingDrawer() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(rapidRecordingTypes[0].id)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const template = useMemo(() => rapidRecordingTypes.find((item) => item.id === selected) || rapidRecordingTypes[0], [selected])

  function saveDraft() {
    setSaved(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-32 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-600/30 lg:bottom-8"
        aria-label="Open quick recording"
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 backdrop-blur-sm">
          <section className="ml-auto flex h-full w-full max-w-xl flex-col rounded-[32px] border border-white/70 bg-white shadow-2xl">
            <header className="border-b border-slate-100 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Rapid recording</p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Quick-add drawer</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Small, mobile-first entries with draft recovery, chronology preview and review guardrails.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Close</button>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-auto p-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {rapidRecordingTypes.map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setSelected(type.id)}
                    className={selected === type.id ? 'rounded-2xl bg-slate-950 px-3 py-3 text-xs font-black text-white' : 'rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-black text-slate-700'}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-blue-900">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Smart template
                </div>
                <p className="mt-2 text-sm leading-6 text-blue-900">{template.hint}</p>
              </div>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Quick note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Write a short operational note. You can expand it later."
                  className="mt-2 min-h-40 w-full rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
                />
              </label>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Recent phrases</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recentPhrases.map((phrase) => (
                    <button key={phrase} type="button" onClick={() => setNote((current) => `${current}${current ? ' ' : ''}${phrase}`)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"><Mic className="mb-2 h-4 w-4" />Voice dictation placeholder</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"><WifiOff className="mb-2 h-4 w-4" />Offline queue foundation</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"><RotateCcw className="mb-2 h-4 w-4" />Draft recovery enabled</div>
              </div>

              {saved ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  Draft saved locally. Chronology preview is ready; final chronology writeback remains explicit to avoid duplicate records.
                </div>
              ) : null}
            </div>

            <footer className="border-t border-slate-100 p-4">
              <div className="flex gap-2">
                <button type="button" onClick={saveDraft} className="flex flex-1 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                  Rapid save
                </button>
                <button type="button" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">AI draft</button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  )
}
