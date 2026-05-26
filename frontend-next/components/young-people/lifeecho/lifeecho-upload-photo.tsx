'use client'

import { useState } from 'react'

export function LifeEchoUploadPhoto({ childId }: { childId: string }) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [message, setMessage] = useState('')

  return (
    <form
      data-testid="lifeecho-upload-photo"
      className="rounded-[24px] border border-dashed border-violet-200 bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault()
        setMessage('Upload uses /api/lifeecho-memories upload — add photo path when storage is wired.')
      }}
    >
      <p className="text-sm font-black text-slate-950">Add a photo or moment</p>
      <p className="mt-1 text-xs text-slate-500">Child {childId} · adults approve before publishing</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
      />
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Safe summary (no safeguarding detail)"
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        rows={3}
      />
      <input type="file" accept="image/*" className="mt-3 text-sm" />
      <button type="submit" className="mt-3 rounded-2xl bg-violet-700 px-5 py-2 text-sm font-black text-white">
        Upload for review
      </button>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </form>
  )
}
