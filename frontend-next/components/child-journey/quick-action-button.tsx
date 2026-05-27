'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ClipboardPlus, Mic, Plus, X } from 'lucide-react'

import { childQuickActionHref, contextualChildQuickActions } from '@/lib/child-journey/workflows'

export function QuickActionButton({ selectedYoungPersonId, selectedYoungPersonName }: { selectedYoungPersonId?: string; selectedYoungPersonName?: string }) {
  const [open, setOpen] = useState(false)
  const childName = selectedYoungPersonName || 'this young person'
  const actions = contextualChildQuickActions({ workflow: 'journey' })

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-28 left-5 z-40 hidden items-center gap-2 rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 md:inline-flex lg:bottom-8 lg:left-[306px]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Plus className="h-5 w-5" aria-hidden />
        Record with care
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/45 p-3 backdrop-blur-md md:p-6" role="dialog" aria-modal="true" aria-label="Record with care actions">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close record actions" onClick={() => setOpen(false)} />
          <div className="relative mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-2xl shadow-slate-950/20">
            <div className="border-b border-slate-100 p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Record with care</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">
                    {selectedYoungPersonId ? `What are you recording for ${childName}?` : 'Choose a young person first'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {selectedYoungPersonId
                      ? 'Open the right child-linked workflow, keep the story visible, and ask ORB if wording or evidence needs checking.'
                      : 'Pick a young person first so every record is safely linked to the right journey.'}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50" aria-label="Close record actions">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              {selectedYoungPersonId ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {actions.map((action) => {
                    const href = childQuickActionHref(selectedYoungPersonId, action)
                    const Icon = action.id === 'dictate-orb' ? Mic : ClipboardPlus
                    return (
                      <Link key={action.id} href={href} onClick={() => setOpen(false)} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-blue-100 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100">
                        <Icon className="h-5 w-5 text-blue-700" aria-hidden />
                        <span className="mt-3 block text-base font-black text-slate-950">{action.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{action.description}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-blue-100 bg-blue-50 p-6">
                  <h3 className="text-xl font-black text-slate-950">Select the young person once</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">Record actions are child-linked. Choose the child clearly, then each form opens with that young person already selected.</p>
                  <Link href="/young-people" onClick={() => setOpen(false)} className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">
                    Go to young person selector
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
