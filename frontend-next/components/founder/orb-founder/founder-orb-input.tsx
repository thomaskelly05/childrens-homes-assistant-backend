'use client'

import { FormEvent, KeyboardEvent } from 'react'
import { Send, Shield } from 'lucide-react'

type FounderOrbInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function FounderOrbInput({ value, onChange, onSubmit, disabled }: FounderOrbInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="border-t border-white/10 bg-black/20 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-end gap-3">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a strategic question about IndiCare Intelligence..."
            rows={2}
            disabled={disabled}
            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-[#0a0f18] px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="inline-flex h-[52px] items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-5 text-sm font-bold text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden />
            Send
          </button>
        </div>

        <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-600">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          <p>
            Founder-only intelligence. Anonymised operational data only — no child identifiable information, no staff
            identifiable information, and no personal safeguarding records.
          </p>
        </div>
      </form>
    </div>
  )
}
