'use client'

import { FormEvent, useState } from 'react'

export function CreateThreadPanel() {
  const [title, setTitle] = useState('')
  const [threadType, setThreadType] = useState('home_channel')
  const [memberIds, setMemberIds] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    setStatus(null)
    try {
      const response = await fetch('/api/connect/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          thread_type: threadType,
          member_ids: memberIds.split(',').map((item) => Number(item.trim())).filter((item) => Number.isFinite(item) && item > 0)
        })
      })
      if (!response.ok) throw new Error('Thread could not be created.')
      setTitle('')
      setMemberIds('')
      setStatus('Thread created. Refresh to open it.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Thread could not be created.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-[28px] border border-slate-100 bg-slate-50 p-4">
      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">Start a real thread</h3>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Thread title"
        className="w-full rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100"
      />
      <select value={threadType} onChange={(event) => setThreadType(event.target.value)} className="w-full rounded-2xl border border-white bg-white px-4 py-3 text-sm font-black text-slate-700">
        <option value="home_channel">Home channel</option>
        <option value="direct">Direct message</option>
        <option value="group">Group thread</option>
        <option value="handover">Handover thread</option>
      </select>
      <input
        value={memberIds}
        onChange={(event) => setMemberIds(event.target.value)}
        placeholder="Real staff user ids, comma separated"
        className="w-full rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100"
      />
      <button type="submit" disabled={creating || !title.trim()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
        {creating ? 'Creating...' : 'Create thread'}
      </button>
      {status ? <p className="text-sm font-bold text-slate-600">{status}</p> : null}
    </form>
  )
}
