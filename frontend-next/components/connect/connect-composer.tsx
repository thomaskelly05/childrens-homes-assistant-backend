'use client'

import { FormEvent, useState } from 'react'

export function ConnectComposer({ threadId }: { threadId: number | string }) {
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setStatus(null)
    try {
      const response = await fetch(`/api/connect/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body, priority })
      })
      if (!response.ok) throw new Error('Message could not be sent.')
      setBody('')
      setPriority('normal')
      setStatus('Message sent.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[28px] border border-blue-100 bg-blue-50/70 p-4">
      <label className="block text-xs font-black uppercase tracking-[0.18em] text-blue-700" htmlFor="connect-message">Message</label>
      <textarea
        id="connect-message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a short professional message..."
        className="mt-2 min-h-28 w-full rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-black text-slate-700">
          <option value="normal">Normal</option>
          <option value="important">Important</option>
          <option value="urgent">Urgent</option>
        </select>
        <button type="submit" disabled={sending || !body.trim()} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 disabled:opacity-60">
          {sending ? 'Sending...' : 'Send'}
        </button>
        {status ? <p className="text-sm font-bold text-slate-600">{status}</p> : null}
      </div>
    </form>
  )
}
