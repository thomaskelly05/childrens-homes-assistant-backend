export type ReconnectCallbacks = {
  onReconnect?: () => void
  onDisconnect?: () => void
  onStatusChange?: (connected: boolean) => void
}

export class ReconnectManager {
  private connected = true
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private retryCount = 0
  private readonly maxRetries = 12

  constructor(private callbacks: ReconnectCallbacks = {}) {}

  markDisconnected() {
    if (!this.connected) return

    this.connected = false
    this.callbacks.onDisconnect?.()
    this.callbacks.onStatusChange?.(false)

    this.scheduleReconnect()
  }

  markConnected() {
    this.connected = true
    this.retryCount = 0

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.callbacks.onReconnect?.()
    this.callbacks.onStatusChange?.(true)
  }

  private scheduleReconnect() {
    if (this.retryCount >= this.maxRetries) return

    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 15000)

    this.reconnectTimer = setTimeout(() => {
      this.retryCount += 1
      this.callbacks.onReconnect?.()
    }, delay)
  }
}
