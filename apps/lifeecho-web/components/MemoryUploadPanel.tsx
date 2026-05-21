'use client'

import { useState } from 'react'

export function MemoryUploadPanel() {
  const [status, setStatus] = useState<string | null>(null)

  async function createUploadIntent() {
    setStatus('Preparing upload space...')

    try {
      const response = await fetch('/api/life-echo/media/upload-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          child_id: 'demo_child',
          filename: 'memory-photo.jpg',
          media_type: 'photo',
        }),
      })

      if (!response.ok) {
        throw new Error('Unable to prepare upload.')
      }

      setStatus('Upload space ready.')
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Unable to create upload intent.',
      )
    }
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            Upload memories
          </h2>

          <p className="mt-3 max-w-2xl text-white/60">
            Preserve photos, voice memories, achievements and emotionally important moments.
          </p>
        </div>

        <button
          onClick={createUploadIntent}
          className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm text-white/80 transition hover:bg-white/15"
        >
          Prepare upload
        </button>
      </div>

      {status ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
          {status}
        </div>
      ) : null}
    </section>
  )
}
