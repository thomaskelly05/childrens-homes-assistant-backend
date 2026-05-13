'use client'

import { useEffect, useRef, useState } from 'react'

import { AssistantEmptyState } from '@/components/assistant/assistant-empty-state'
import { AssistantStatusBar } from '@/components/assistant/assistant-status-bar'
import { AssistantWaveform } from '@/components/assistant/assistant-waveform'
import { ConversationSidebar } from '@/components/assistant/conversation-sidebar'

import {
  assistantRuntime,
  AssistantMessage,
  RuntimeState
} from '@/lib/realtime/assistant-runtime'

import { useAssistantConversations } from '@/hooks/use-assistant-conversations'

export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([])

  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    connected: false,
    listening: false,
    speaking: false,
    streaming: false,
    wakeWordEnabled: false,
    realtimeVoiceConnected: false
  })

  const [input, setInput] = useState('')

  const {
    conversations,
    activeConversation,
    activeConversationId,
    loading,
    error,
    createConversation,
    selectConversation,
    saveConversation
  } = useAssistantConversations()

  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    assistantRuntime.connect()

    const unsubscribeState = assistantRuntime.onState(setRuntimeState)

    const unsubscribeMessages = assistantRuntime.onMessages((nextMessages) => {
      setMessages(nextMessages)

      if (activeConversationId) {
        void saveConversation(activeConversationId, nextMessages).catch(() => undefined)
      }
    })

    return () => {
      unsubscribeState()
      unsubscribeMessages()
    }
  }, [activeConversationId, saveConversation])

  useEffect(() => {
    if (activeConversation?.messages?.length) {
      setMessages(activeConversation.messages)
      assistantRuntime.loadMessages(activeConversation.messages)
    }
  }, [activeConversation])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(messageOverride?: string) {
    const value = messageOverride || input

    if (!value.trim()) return

    setInput('')

    await assistantRuntime.sendMessage(value)
  }

  async function handleCreateConversation() {
    await createConversation()
    setMessages([])
    assistantRuntime.resetConversation()
  }

  return (
    <section className="flex min-h-[calc(100vh-132px)] overflow-hidden rounded-[32px] border border-slate-800 bg-[#0b1020] text-white shadow-2xl shadow-slate-950/20">
      <ConversationSidebar
        conversations={conversations.map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleString() : 'Not saved yet'
        }))}
        activeConversationId={activeConversationId}
        onSelect={selectConversation}
        onCreateConversation={handleCreateConversation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.04em]">
              Assistant command workspace
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Context-aware care assistant with deterministic fallback if the live backend is unavailable.
            </p>
            {loading ? <p className="mt-1 text-xs text-slate-500">Loading conversations...</p> : null}
            {error ? <p className="mt-1 text-xs text-amber-300">Conversation persistence warning: {error}</p> : null}
          </div>

          <div className="flex items-center gap-4">
            {(runtimeState.listening || runtimeState.speaking) ? (
              <AssistantWaveform active />
            ) : null}

            <AssistantStatusBar
              connected={runtimeState.connected}
              listening={runtimeState.listening}
              speaking={runtimeState.speaking}
              streaming={runtimeState.streaming}
              error={runtimeState.error}
            />
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-5 py-8">
          {!messages.length ? (
            <AssistantEmptyState onPromptSelect={sendMessage} />
          ) : (
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
          )}
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
                onClick={() => sendMessage()}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.35)]"
              >
                Send
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  )
}
