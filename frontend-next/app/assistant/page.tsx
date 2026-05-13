'use client'

import { useEffect, useRef, useState } from 'react'

import { AssistantWaveform } from '@/components/assistant/assistant-waveform'
import { ConversationSidebar } from '@/components/assistant/conversation-sidebar'

import {
  assistantRuntime,
  AssistantMessage,
  RuntimeState
} from '@/lib/realtime/assistant-runtime'

const mockConversations = [
  {
    id: 'handover-review',
    title: 'Evening handover review',
    updatedAt: '2 mins ago'
  },
  {
    id: 'safeguarding-patterns',
    title: 'Safeguarding patterns',
    updatedAt: '18 mins ago'
  },
  {
    id: 'chronology-summary',
    title: 'Chronology summary',
    updatedAt: '1 hour ago'
  }
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([])

  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    connected: false,
    listening: false,
    speaking: false,
    streaming: false
  })

  const [input, setInput] = useState('')

  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    assistantRuntime.connect()

    const unsubscribeState = assistantRuntime.onState(setRuntimeState)
    const unsubscribeMessages = assistantRuntime.onMessages(setMessages)

    return () => {
      unsubscribeState()
      unsubscribeMessages()
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim()) return

    const next = input
    setInput('')

    await assistantRuntime.sendMessage(next)
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#0b1020] text-white">
      <ConversationSidebar
        conversations={mockConversations}
        activeConversationId="handover-review"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.04em]">
              IndiCare Intelligence
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Unified conversational operating system
            </p>
          </div>

          <div className="flex items-center gap-4">
            {(runtimeState.listening || runtimeState.speaking) ? (
              <AssistantWaveform active />
            ) : null}

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <div
                className={`h-2.5 w-2.5 rounded-full ${runtimeState.connected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]' : 'bg-red-400'}`}
              />

              {runtimeState.connected
                ? 'Realtime connected'
                : 'Realtime unavailable'}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-5 py-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-[28px] px-6 py-5 text-[15px] leading-8 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${message.role === 'assistant' ? 'bg-[#151c31] text-white' : 'ml-auto bg-emerald-400 text-slate-950'}`}
              >
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] opacity-60">
                  {message.role === 'assistant' ? 'IndiCare' : 'You'}
                </div>

                <div className="whitespace-pre-wrap">
                  {message.content}

                  {message.streaming ? (
                    <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-full bg-emerald-300 align-middle" />
                  ) : null}
                </div>
              </div>
            ))}

            {runtimeState.listening ? (
              <div className="max-w-[240px] rounded-[28px] border border-emerald-400/30 bg-emerald-400/10 px-6 py-5 text-sm text-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.15)]">
                Listening for speech...
              </div>
            ) : null}

            <div ref={endRef} />
          </div>
        </section>

        <footer className="border-t border-white/10 bg-black/20 px-5 py-5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-[32px] border border-white/10 bg-[#151b2d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <textarea
              value={input}
              disabled={runtimeState.streaming}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Message IndiCare..."
              className="max-h-48 min-h-[64px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-7 outline-none placeholder:text-slate-500"
            />

            <button
              onClick={() => assistantRuntime.toggleListening()}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${runtimeState.listening ? 'bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.5)]' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              {runtimeState.listening ? 'Stop voice' : 'Voice'}
            </button>

            {runtimeState.streaming ? (
              <button
                onClick={() => assistantRuntime.interrupt()}
                className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950"
              >
                Interrupt
              </button>
            ) : (
              <button
                onClick={sendMessage}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.35)]"
              >
                Send
              </button>
            )}
          </div>
        </footer>
      </div>
    </main>
  )
}
