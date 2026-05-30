'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { fetchOrbResidential } from '@/components/orb-residential/orb-residential-api'

const QUICK_ACTIONS = [
  'Record this properly',
  'Think safeguarding',
  'Therapeutic reframe',
  'Ofsted lens',
]

const HISTORY = [
  'Evening handover wording',
  'After-contact reflection',
  'Safeguarding concern notes',
]

export default function OrbAskPage() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault()
    const text = message.trim()
    if (!text) return
    setLastPrompt(text)
    setLoading(true)
    setError(null)
    setAnswer('')
    try {
      const payload = await fetchOrbResidential<{ data: { answer?: string } }>('/orb/residential/conversation', {
        method: 'POST',
        body: JSON.stringify({ message: text, mode: 'Ask ORB' }),
      })
      setAnswer(String(payload.data?.answer || ''))
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 402) {
        setError('Premium access required — start your trial or subscribe (£9.99/month).')
      } else {
        setError('Could not reach ORB. Check you are signed in and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function useQuickAction(action: string) {
    setMessage((current) => `${action}: ${current}`.trim())
  }

  return (
    <div className="grid min-h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[17rem_1fr]">
      <aside className="hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-xl shadow-slate-200/70 backdrop-blur lg:block">
        <Link href="/orb" className="flex items-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300">
          <span className="text-lg">✦</span>
          New ORB chat
        </Link>

        <div className="mt-5">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Today</p>
          <div className="mt-2 space-y-1">
            {HISTORY.map((item) => (
              <button
                key={item}
                type="button"
                className="w-full truncate rounded-xl px-3 py-2 text-left text-sm text-[#4B5563] hover:bg-[#F3F4F6]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-4 text-sm text-[#4B5563]">
          <p className="font-semibold text-[#111827]">ORB Residential</p>
          <p className="mt-2 leading-5">ORB only uses what you type, upload or save here. No IndiCare OS records.</p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/80 backdrop-blur">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">ORB Residential</p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-[#111827]">Ask ORB</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/orb/shift-builder" className="rounded-full bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-[#4B5563] hover:bg-[#E5E7EB]">
              Shift Builder
            </Link>
            <Link href="/orb/outputs" className="hidden rounded-full bg-[#F3F4F6] px-3 py-2 text-xs font-medium text-[#4B5563] hover:bg-[#E5E7EB] sm:inline-flex">
              Saved
            </Link>
          </div>
        </div>

        <div className="border-b border-[#EEF2F7] px-4 py-3 sm:px-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => useQuickAction(action)}
                className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#374151] transition hover:bg-[#EEF2FF]"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
          {!answer && !loading && !error && !lastPrompt ? (
            <div className="mx-auto max-w-2xl py-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#111827] to-[#4338CA] text-3xl text-white shadow-lg shadow-indigo-200">
                ✦
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#111827]">What do you want to think through?</h2>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                Recording, safeguarding, therapeutic reflection, shift pressure, Ofsted evidence or wording support.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  'Help me write this professionally',
                  'Help me think about this safely',
                  'Reframe this therapeutically',
                  'What might Ofsted look for?',
                ].map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => setMessage(starter)}
                    className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left text-sm text-[#4B5563] shadow-sm hover:bg-[#F8FAFC]"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {lastPrompt ? (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl bg-[#111827] px-5 py-3 text-sm leading-6 text-white shadow-lg shadow-slate-200">
                {lastPrompt}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#111827] to-[#4338CA] text-white">✦</div>
              <div className="rounded-3xl bg-[#F8FAFC] px-4 py-3 text-sm text-[#6B7280]">
                ORB is thinking carefully…
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {answer ? (
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#111827] to-[#4338CA] text-white">✦</div>
              <article className="max-w-none flex-1 rounded-3xl bg-[#F8FAFC] px-5 py-4 text-sm leading-7 text-[#111827] whitespace-pre-wrap">
                {answer}
              </article>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="border-t border-[#EEF2F7] bg-white/80 p-3 sm:p-4">
          <div className="rounded-[1.75rem] border border-[#D1D5DB] bg-white p-2 shadow-sm focus-within:border-[#111827] focus-within:shadow-md">
            <textarea
              className="max-h-44 min-h-[76px] w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[#9CA3AF]"
              placeholder="Message ORB…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <div className="flex gap-2 text-xs text-[#6B7280]">
                <button type="button" className="rounded-full bg-[#F3F4F6] px-3 py-1.5 hover:bg-[#E5E7EB]">
                  + Upload
                </button>
                <button type="button" className="rounded-full bg-[#F3F4F6] px-3 py-1.5 hover:bg-[#E5E7EB]">
                  Voice
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="rounded-full bg-[#111827] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Thinking' : 'Send'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-[#9CA3AF]">
            ORB can make mistakes. Use professional judgement and follow safeguarding procedures.
          </p>
        </form>
      </section>
    </div>
  )
}
