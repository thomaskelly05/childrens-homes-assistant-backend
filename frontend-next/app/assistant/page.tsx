'use client'

import { useState } from 'react'
import { FileUp, Mic, Paperclip, Send, Sparkles } from 'lucide-react'

import { StandaloneAssistantShell, StandaloneOrbVisual } from '@/lib/standalone-assistant/assistant-shell'
import { assistantBrains, assistantPrompts } from '@/lib/standalone-assistant/config'
import type { StandaloneBrainId } from '@/lib/standalone-assistant/types'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function AssistantPage() {
  const [brain, setBrain] = useState<StandaloneBrainId>('general_assistant')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [voiceOpen, setVoiceOpen] = useState(false)

  function sendMessage(text = input) {
    const value = text.trim()
    if (!value) return
    setInput('')
    setMessages((current) => [
      ...current,
      { role: 'user', content: value },
      {
        role: 'assistant',
        content: 'Standalone assistant foundation active. I can answer general and static sector questions, draft documents, and work with uploaded or pasted material. I do not have access to live IndiCare OS child, home, chronology, action, evidence or staff records.'
      }
    ])
  }

  return (
    <StandaloneAssistantShell>
      <div className="grid min-h-[calc(100vh-11rem)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-[620px] flex-col rounded-[34px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#11131a]">
          <div className="border-b border-slate-200 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-black text-slate-500 dark:text-slate-400" htmlFor="brain-selector">Brain</label>
              <select
                id="brain-selector"
                value={brain}
                onChange={(event) => setBrain(event.target.value as StandaloneBrainId)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-cyan-400 dark:border-white/10 dark:bg-white/10"
              >
                {assistantBrains.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <span className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-200">
                Standalone memory
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                Static sector knowledge only
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {messages.length ? (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`max-w-[82%] rounded-[28px] px-5 py-4 text-sm leading-7 ${
                      message.role === 'user'
                        ? 'ml-auto bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                        : 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100'
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[470px] flex-col items-center justify-center text-center">
                <StandaloneOrbVisual large />
                <p className="mt-8 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">Separate AI workspace</p>
                <h2 className="mt-3 max-w-3xl text-5xl font-black tracking-[-0.08em]">How can IndiCare Assistant help?</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">
                  ChatGPT-style workspace for writing, sector guidance, projects, uploads, templates, apps and voice. No OS sidebar, no child journey panels, no live care-record context.
                </p>
                <div className="mt-8 grid w-full max-w-3xl gap-3 md:grid-cols-2">
                  {assistantPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-left text-sm font-bold leading-6 text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-cyan-300/10"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            className="border-t border-slate-200 p-4 dark:border-white/10"
            onSubmit={(event) => {
              event.preventDefault()
              sendMessage()
            }}
          >
            <div className="flex items-end gap-3 rounded-[30px] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <button type="button" className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm dark:bg-white/10 dark:text-slate-300" aria-label="Upload file">
                <Paperclip className="h-5 w-5" aria-hidden />
              </button>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Message IndiCare Assistant, paste content, or ask for a draft..."
                className="max-h-44 min-h-[54px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-7 outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setVoiceOpen((value) => !value)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm dark:bg-white/10 dark:text-white">
                <Mic className="mr-2 inline h-4 w-4" aria-hidden />
                Voice
              </button>
              <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 dark:bg-cyan-300 dark:text-slate-950">
                <Send className="mr-2 inline h-4 w-4" aria-hidden />
                Send
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          {voiceOpen ? (
            <section className="rounded-[34px] border border-slate-900 bg-black p-6 text-white shadow-2xl shadow-cyan-950/20">
              <StandaloneOrbVisual large />
              <h3 className="mt-6 text-2xl font-black tracking-[-0.05em]">Standalone voice mode</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">Orb-style voice surface for general and sector questions. It uses separate standalone assistant context and memory.</p>
            </section>
          ) : null}

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Upload foundation</p>
            <h3 className="mt-2 text-xl font-black tracking-[-0.04em]">Documents stay standalone</h3>
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-white/20">
              <FileUp className="mx-auto h-6 w-6 text-cyan-500" aria-hidden />
              <p className="mt-3 text-sm font-bold">PDF, Word, TXT and images later</p>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Safe filename, size, classification and citation foundations; no automatic OS writeback.</p>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Current brain</p>
            <h3 className="mt-2 text-xl font-black tracking-[-0.04em]">{assistantBrains.find((item) => item.id === brain)?.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{assistantBrains.find((item) => item.id === brain)?.description}</p>
          </section>
        </aside>
      </div>
    </StandaloneAssistantShell>
  )
}
