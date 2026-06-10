'use client'

import { useState } from 'react'
import { Brain } from 'lucide-react'

import { saveTextToFounderMemory } from '@/lib/founder/memory'
import type { FounderMemoryItemType } from '@/lib/founder/memory/founder-memory-types'

type SaveToFounderMemoryButtonProps = {
  type?: FounderMemoryItemType
  title: string
  content: string
  tags?: string[]
  linkedEntityId?: string
  linkedEntityType?: string
  source?: string
  className?: string
}

export function SaveToFounderMemoryButton({
  type = 'decision',
  title,
  content,
  tags,
  linkedEntityId,
  linkedEntityType,
  source,
  className = ''
}: SaveToFounderMemoryButtonProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setStatus('saving')
    setError(null)
    const result = await saveTextToFounderMemory({
      type,
      title: title.slice(0, 200),
      content: content.slice(0, 4000),
      tags,
      linkedEntityId,
      linkedEntityType,
      source
    })
    if (result.errors?.length) {
      setStatus('error')
      setError(result.errors[0])
      return
    }
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={status === 'saving' || !content.trim()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 transition hover:border-violet-400/50 disabled:opacity-50"
      >
        <Brain className="h-3.5 w-3.5" aria-hidden />
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved to Memory' : 'Save to Founder Memory'}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-300">{error}</p> : null}
    </div>
  )
}
