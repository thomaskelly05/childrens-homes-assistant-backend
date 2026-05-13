export type OpenAIRealtimeTransportCallbacks = {
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: string) => void
  onMessage?: (payload: unknown) => void
}

export class OpenAIRealtimeTransport {
  private socket: WebSocket | null = null

  constructor(
    private url: string,
    private callbacks: OpenAIRealtimeTransportCallbacks = {}
  ) {}

  connect() {
    if (typeof window === 'undefined') return
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return

    try {
      this.socket = new WebSocket(this.url)

      this.socket.onopen = () => {
        this.callbacks.onOpen?.()
      }

      this.socket.onclose = () => {
        this.callbacks.onClose?.()
      }

      this.socket.onerror = () => {
        this.callbacks.onError?.('Realtime websocket transport failed.')
      }

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          this.callbacks.onMessage?.(parsed)
        } catch {
          this.callbacks.onMessage?.(event.data)
        }
      }
    } catch (error) {
      this.callbacks.onError?.(String(error))
    }
  }

  send(payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.socket.send(JSON.stringify(payload))
  }

  disconnect() {
    this.socket?.close()
    this.socket = null
  }

  connected() {
    return this.socket?.readyState === WebSocket.OPEN
  }
}
