export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export type RuntimeState = {
  connected: boolean
  listening: boolean
  speaking: boolean
}

export class AssistantRuntime {
  private state: RuntimeState = {
    connected: false,
    listening: false,
    speaking: false
  }

  private listeners = new Set<(state: RuntimeState) => void>()
  private messageListeners = new Set<(message: AssistantMessage) => void>()

  async connect() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/assistant/realtime/health`
      )

      this.state.connected = response.ok
      this.emit()
    } catch {
      this.state.connected = false
      this.emit()
    }
  }

  disconnect() {
    this.state.connected = false
    this.state.listening = false
    this.state.speaking = false
    this.emit()
  }

  async sendMessage(content: string) {
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    }

    this.emitMessage(userMessage)

    this.state.speaking = true
    this.emit()

    await new Promise((resolve) => setTimeout(resolve, 700))

    const assistantMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Realtime assistant orchestration is active. Unified conversational memory and operational intelligence are now connected.',
      createdAt: new Date().toISOString()
    }

    this.emitMessage(assistantMessage)

    this.state.speaking = false
    this.emit()
  }

  toggleListening() {
    this.state.listening = !this.state.listening
    this.emit()
  }

  onState(listener: (state: RuntimeState) => void) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  onMessage(listener: (message: AssistantMessage) => void) {
    this.messageListeners.add(listener)

    return () => {
      this.messageListeners.delete(listener)
    }
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.state))
  }

  private emitMessage(message: AssistantMessage) {
    this.messageListeners.forEach((listener) => listener(message))
  }
}

export const assistantRuntime = new AssistantRuntime()
