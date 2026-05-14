'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ClipboardPlus, Mic, Plus, Sparkles, X } from 'lucide-react'

import { quickActionOrder, recordingWorkflows } from '@/lib/child-journey/workflows'

export function QuickActionButton({
  selectedYoungPersonId,
  selectedYoungPersonName
}: {
  selectedYoungPersonId?: string
  selectedYoungPersonName?: string
}) {
  const [open, setOpen] = useState(false)
  const childName = selectedYoungPersonName || 'this young person'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-28 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-blue-950/25 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 lg:bottom-8 lg:right-24"
        aria-haspopup="dialog"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Quick action
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Quick action sheet">
          <div className="ml-auto flex h-full max-w-xl flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-2xl shadow-slate-950/20">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Quick action</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                    {selectedYoungPersonId ? `Record for ${childName}` : 'Choose a child first'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {selectedYoungPersonId
                      ? 'This action will keep the child selected and open the correct workflow.'
                      : 'Pick a young person from Home so the record is safely linked to the right journey.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Close quick actions"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              {selectedYoungPersonId ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {quickActionOrder.map((id) => {
                    const workflow = recordingWorkflows[id]
                    const mode = id === 'documents' ? 'upload' : 'new'
                    return (
                      <Link
                        key={id}
                        href={`/young-people/${encodeURIComponent(selectedYoungPersonId)}/${workflow.routeSegment}/${mode}`}
                        onClick={() => setOpen(false)}
                        className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-blue-100 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      >
                        <ClipboardPlus className="h-5 w-5 text-blue-700" aria-hidden />
                        <span className="mt-3 block text-base font-black text-slate-950">{workflow.quickActionLabel}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{workflow.tone}</span>
                      </Link>
                    )
                  })}
                  <Link href={`/assistant?youngPersonId=${encodeURIComponent(selectedYoungPersonId)}`} onClick={() => setOpen(false)} className="rounded-[24px] border border-purple-100 bg-purple-50 p-4 text-left transition hover:bg-purple-100">
                    <Sparkles className="h-5 w-5 text-purple-700" aria-hidden />
                    <span className="mt-3 block text-base font-black text-purple-950">Ask Orb</span>
                    <span className="mt-1 block text-xs leading-5 text-purple-700">Open assistant with this child in context.</span>
                  </Link>
                  <Link href={`/assistant?mode=dictate&youngPersonId=${encodeURIComponent(selectedYoungPersonId)}`} onClick={() => setOpen(false)} className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100">
                    <Mic className="h-5 w-5 text-emerald-700" aria-hidden />
                    <span className="mt-3 block text-base font-black text-emerald-950">Dictate with Orb</span>
                    <span className="mt-1 block text-xs leading-5 text-emerald-700">Orb can draft wording; staff review before saving.</span>
                  </Link>
                </div>
              ) : (
                <div className="rounded-[28px] border border-blue-100 bg-blue-50 p-6">
                  <h3 className="text-xl font-black text-slate-950">Select the child once</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">Quick actions are child-linked. Home shows each child clearly, then every form opens with that child already selected.</p>
                  <Link href="/home" onClick={() => setOpen(false)} className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">
                    Go to child selector
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
