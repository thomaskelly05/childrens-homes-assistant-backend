'use client'

import { FormEvent, useState } from 'react'

import { fetchOrbResidential } from '@/components/orb-residential/orb-residential-api'

export default function OrbResidentialAskPage() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchOrbResidential<{ data: { answer?: string } }>('/orb/residential/conversation', {
        method: 'POST',
        body: JSON.stringify({ message, mode: 'Ask ORB' }),
      })
      setAnswer(String(payload.data?.answer || ''))
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 402) {
        setError('Premium access required — start your trial or subscribe (£9.99/month).')
      } else {
        setError('Could not reach ORB. Check you are signed in.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ask ORB</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          className="min-h-[140px] w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
          placeholder="What would you like support with?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="rounded-full bg-[#111827] px-5 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Ask ORB'}
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {answer ? (
        <article className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {answer}
        </article>
      ) : null}
    </div>
  )
}
