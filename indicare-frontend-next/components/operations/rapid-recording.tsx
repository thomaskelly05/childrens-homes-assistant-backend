'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mic, Plus, RotateCcw, Save, Sparkles, WifiOff } from 'lucide-react'

import { rapidRecordingTypes } from '@/lib/operations/shift-data'
import { getSafeDraft, removeSafeDraft, setSafeDraft } from '@/lib/security/safe-storage'

const recentPhrases = [
  'Presented as settled and engaged with routine.',
  'Welfare check completed; no immediate concerns observed.',
  'Evidence suggests manager review is required before closure.',
  'Follow-up action added for next shift handover.'
]

const childVoiceSnippets = [
  'The child said...',
  'The child chose...',
  'The child appeared to feel...',
  'The child wanted adults to know...'
]

const wellbeingIndicators = ['Settled', 'Positive', 'Low mood', 'Anxious', 'Heightened', 'Withdrawn']

export function RapidRecordingDrawer() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(rapidRecordingTypes[0].id)
  const [note, setNote] = useState('')
  const [wellbeing, setWellbeing] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const template = useMemo(() => rapidRecordingTypes.find((item) => item.id === selected) || rapidRecordingTypes[0], [selected])

  useEffect(() => {
    try {
      const draft = getSafeDraft<{ selected?: string; note?: string; wellbeing?: string }>('indicare-rapid-recording-draft')
      if (!draft) return
      const parsed = draft.value
      setSelected(parsed.selected || rapidRecordingTypes[0].id)
      setNote(parsed.note || '')
      setWellbeing(parsed.wellbeing || '')
    } catch {
      removeSafeDraft('indicare-rapid-recording-draft')
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSafeDraft('indicare-rapid-recording-draft', { selected, note, wellbeing }, undefined, 'confidential_child')
    }, 400)
    return () => window.clearTimeout(handle)
  }, [note, selected, wellbeing])

  function saveDraft() {
    if (!note.trim()) {
      setSaveError('Add a short note before saving the rapid draft.')
      return
    }
    setSaveError(null)
    setSaved(true)
    removeSafeDraft('indicare-rapid-recording-draft')
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
                <p className="mt-2 text-sm leading-6 text-slate-500">Small, mobile-first entries with draft recovery, chronology preview and explicit save boundaries.</p>
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

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Quick wellbeing</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {wellbeingIndicators.map((indicator) => (
                    <button
                      key={indicator}
                      type="button"
                      onClick={() => setWellbeing(indicator)}
                      className={wellbeing === indicator ? 'rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white' : 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700'}
                    >
                      {indicator}
                    </button>
                  ))}
                </div>
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

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Child voice snippets</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {childVoiceSnippets.map((phrase) => (
                    <button key={phrase} type="button" onClick={() => setNote((current) => `${current}${current ? ' ' : ''}${phrase}`)} className="rounded-full border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700">
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"><Mic className="mb-2 h-4 w-4" />Use device dictation in the note field</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"><WifiOff className="mb-2 h-4 w-4" />Local draft only until workflow save</div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600"><RotateCcw className="mb-2 h-4 w-4" />Resume draft recovery enabled</div>
              </div>

              {saved ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  Local draft held. Chronology preview is ready; final chronology writeback remains explicit to avoid duplicate records.
                </div>
              ) : null}
              {saveError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {saveError}
                </div>
              ) : null}
            </div>

            <footer className="sticky bottom-0 border-t border-slate-100 bg-white p-4">
              <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">
                Chronology preview: {wellbeing ? `${wellbeing} - ` : ''}{note || 'Start typing to preview the handover/chronology wording.'}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={saveDraft} className="flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                  Hold local draft
                </button>
                <button type="button" onClick={() => setNote((current) => `${current}${current ? '\n' : ''}Review prompt: summarise this into a factual, child-centred note for staff to review.`)} className="min-h-12 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Add review prompt</button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  )
}
