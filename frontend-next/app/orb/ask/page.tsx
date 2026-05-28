'use client'

import { FormEvent, useState } from 'react'

import { fetchOrbResidential } from '@/components/orb-residential/orb-residential-api'

const QUICK_ACTIONS = [
  'Record this properly',
  'Think safeguarding',
  'Therapeutic reframe',
  'Ofsted lens',
]

export default function OrbAskPage() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault()
    const text = message.trim()
    if (!text) return
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
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-4xl flex-col">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">ORB Residential</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Ask ORB</h1>
        </div>
        <div className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#6B7280] shadow-sm">
          Powered by IndiCare Intelligence
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-[2rem] border border-[#E5E7EB] bg-white shadow-xl shadow-slate-200/80">
        <div className="border-b border-[#EEF2F7] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => useQuickAction(action)}
                className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#374151] transition hover:bg-[#EEF2FF]"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {!answer && !loading && !error ? (
            <div className="mx-auto max-w-2xl py-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[#111827] to-[#4338CA] text-2xl text-white shadow-lg shadow-indigo-200">
                ✦
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">What do you want to think through?</h2>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                Ask about recording, safeguarding, therapeutic reflection, shift pressure or Ofsted evidence. ORB only uses
                what you provide here — no live OS records.
              </p>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white">✦</div>
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white">✦</div>
              <article className="max-w-none flex-1 rounded-3xl bg-[#F8FAFC] px-5 py-4 text-sm leading-7 text-[#111827] whitespace-pre-wrap">
                {answer}
              </article>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="border-t border-[#EEF2F7] p-4">
          <div className="rounded-[1.75rem] border border-[#D1D5DB] bg-white p-2 shadow-sm focus-within:border-[#111827]">
            <textarea
              className="max-h-40 min-h-[76px] w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[#9CA3AF]"
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
      </div>
    </div>
  )
}
