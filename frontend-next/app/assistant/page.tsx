'use client'

import { useEffect, useRef, useState } from 'react'
import {
  assistantRuntime,
  AssistantMessage,
  RuntimeState
} from '@/lib/realtime/assistant-runtime'

export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([])

  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    connected: false,
    listening: false,
    speaking: false
  })

  const [input, setInput] = useState('')

  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    assistantRuntime.connect()

    const unsubscribeState = assistantRuntime.onState(setRuntimeState)

    const unsubscribeMessages = assistantRuntime.onMessage((message) => {
      setMessages((current) => [...current, message])
    })

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
    <main className="flex h-screen flex-col bg-[#0f172a] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-2xl font-black">IndiCare Intelligence</h1>
          <p className="text-sm text-slate-400">
            Unified conversational assistant runtime
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div
            className={`h-2.5 w-2.5 rounded-full ${runtimeState.connected ? 'bg-emerald-400' : 'bg-red-400'}`}
          />

          {runtimeState.connected
            ? 'Realtime connected'
            : 'Realtime unavailable'}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-3xl px-5 py-4 text-[15px] leading-7 ${message.role === 'assistant' ? 'bg-slate-800 text-white' : 'ml-auto bg-emerald-500 text-slate-950'}`}
            >
              {message.content}
            </div>
          ))}

          {runtimeState.speaking ? (
            <div className="max-w-[180px] rounded-3xl bg-slate-800 px-5 py-4 text-sm text-slate-300">
              IndiCare is speaking...
            </div>
          ) : null}

          {runtimeState.listening ? (
            <div className="max-w-[180px] rounded-3xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-200">
              Listening...
            </div>
          ) : null}

          <div ref={endRef} />
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-3xl border border-white/10 bg-slate-900 p-4">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Message IndiCare..."
            className="max-h-40 min-h-[56px] flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-slate-500"
          />

          <button
            onClick={() => assistantRuntime.toggleListening()}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${runtimeState.listening ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            {runtimeState.listening ? 'Stop voice' : 'Voice'}
          </button>

          <button
            onClick={sendMessage}
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950"
          >
            Send
          </button>
        </div>
      </footer>
    </main>
  )
}
