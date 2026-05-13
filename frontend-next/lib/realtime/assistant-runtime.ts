import { BrowserVoiceRuntime } from './browser-voice-runtime'

export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  streaming?: boolean
}

export type RuntimeState = {
  connected: boolean
  listening: boolean
  speaking: boolean
  streaming: boolean
  error?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

function messageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function welcomeMessage(): AssistantMessage {
  return {
    id: messageId(),
    role: 'assistant',
    content: 'Hello. I am IndiCare Intelligence. How can I help today?',
    createdAt: new Date().toISOString()
  }
}

export class AssistantRuntime {
  private state: RuntimeState = {
    connected: false,
    listening: false,
    speaking: false,
    streaming: false
  }

  private messages: AssistantMessage[] = [welcomeMessage()]

  private listeners = new Set<(state: RuntimeState) => void>()
  private messageListeners = new Set<(messages: AssistantMessage[]) => void>()
  private abortController: AbortController | null = null

  private voice = new BrowserVoiceRuntime({
    onTranscript: (text) => {
      if (text.trim()) {
        this.sendMessage(text)
      }
    },
    onListeningChange: (listening) => {
      this.state.listening = listening
      this.emit()
    },
    onError: (error) => {
      this.state.error = error
      this.emit()
    }
  })

  async connect() {
    try {
      const response = await fetch(`${API_BASE}/assistant/realtime/health`, {
        credentials: 'include',
        cache: 'no-store'
      })

      this.state.connected = response.ok
      this.state.error = response.ok ? undefined : `Realtime health failed: ${response.status}`
      this.emit()
      this.emitMessages()
    } catch (error) {
      this.state.connected = false
      this.state.error = String(error)
      this.emit()
      this.emitMessages()
    }
  }

  loadMessages(messages: AssistantMessage[]) {
    this.interrupt()
    this.messages = messages.length ? messages : [welcomeMessage()]
    this.emitMessages()
  }

  resetConversation() {
    this.interrupt()
    this.messages = [welcomeMessage()]
    this.emitMessages()
  }

  disconnect() {
    this.abortController?.abort()
    this.abortController = null
    this.voice.stop()

    this.state.connected = false
    this.state.listening = false
    this.state.speaking = false
    this.state.streaming = false

    this.emit()
  }

  async sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || this.state.streaming) return

    const userMessage: AssistantMessage = {
      id: messageId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    }

    const assistantMessage: AssistantMessage = {
      id: messageId(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true
    }

    this.messages = [...this.messages, userMessage, assistantMessage]

    this.state.speaking = true
    this.state.streaming = true
    this.state.error = undefined

    this.emit()
    this.emitMessages()

    this.abortController = new AbortController()

    try {
      const response = await fetch(`${API_BASE}/assistant/general/stream`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        signal: this.abortController.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: trimmed,
          assistant_surface: 'next-assistant',
          assistant_mode: 'assistant',
          conversation_id: 'next-unified-assistant',
          history: this.messages
            .filter((message) => message.content && message.id !== assistantMessage.id)
            .slice(-12)
            .map((message) => ({ role: message.role, content: message.content }))
        })
      })

      if (!response.ok || !response.body) {
        throw new Error(`Assistant stream failed: ${response.status}`)
      }

      await this.consumeStream(response.body, assistantMessage.id)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.updateMessage(
          assistantMessage.id,
          'I could not complete that response just now. Please check the backend assistant stream and try again.',
          false
        )

        this.state.error = String(error)
      }
    } finally {
      this.abortController = null
      this.state.speaking = false
      this.state.streaming = false

      this.emit()
      this.finishStreamingMessage(assistantMessage.id)
    }
  }

  interrupt() {
    this.abortController?.abort()
    this.abortController = null

    this.state.speaking = false
    this.state.streaming = false

    this.emit()

    const lastAssistant = [...this.messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.streaming)

    if (lastAssistant) {
      this.updateMessage(
        lastAssistant.id,
        lastAssistant.content || 'Response interrupted.',
        false
      )
    }
  }

  toggleListening() {
    this.voice.toggle()
  }

  onState(listener: (state: RuntimeState) => void) {
    this.listeners.add(listener)
    listener(this.state)

    return () => {
      this.listeners.delete(listener)
    }
  }

  onMessages(listener: (messages: AssistantMessage[]) => void) {
    this.messageListeners.add(listener)
    listener(this.messages)

    return () => {
      this.messageListeners.delete(listener)
    }
  }

  private async consumeStream(
    body: ReadableStream<Uint8Array>,
    assistantMessageId: string
  ) {
    const reader = body.getReader()
    const decoder = new TextDecoder()

    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        this.applySseEvent(event, assistantMessageId)
      }
    }

    if (buffer.trim()) {
      this.applySseEvent(buffer, assistantMessageId)
    }
  }

  private applySseEvent(event: string, assistantMessageId: string) {
    if (event.includes('event: done') || event.includes('[DONE]')) {
      return
    }

    const lines = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, ''))

    if (!lines.length) return

    const token = lines.join('\n')
    if (!token) return

    const current = this.messages.find(
      (message) => message.id === assistantMessageId
    )

    this.updateMessage(
      assistantMessageId,
      `${current?.content || ''}${token}`,
      true
    )
  }

  private updateMessage(id: string, content: string, streaming: boolean) {
    this.messages = this.messages.map((message) =>
      message.id === id
        ? {
            ...message,
            content,
            streaming
          }
        : message
    )

    this.emitMessages()
  }

  private finishStreamingMessage(id: string) {
    this.messages = this.messages.map((message) =>
      message.id === id
        ? {
            ...message,
            streaming: false,
            content: message.content || 'I could not generate a response.'
          }
        : message
    )

    this.emitMessages()
  }

  private emit() {
    this.listeners.forEach((listener) => listener({ ...this.state }))
  }

  private emitMessages() {
    this.messageListeners.forEach((listener) => listener([...this.messages]))
  }
}

export const assistantRuntime = new AssistantRuntime()
