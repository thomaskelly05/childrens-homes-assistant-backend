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

  markDisconnected(options: { retry?: boolean } = {}) {
    const retry = options.retry ?? true
    if (!retry) this.clearTimer()
    if (!this.connected) {
      if (retry && !this.reconnectTimer) this.scheduleReconnect()
      return
    }

    this.connected = false
    this.callbacks.onDisconnect?.()
    this.callbacks.onStatusChange?.(false)

    if (retry) this.scheduleReconnect()
  }

  markConnected() {
    this.connected = true
    this.retryCount = 0

    this.clearTimer()

    this.callbacks.onStatusChange?.(true)
  }

  cancel() {
    this.retryCount = 0
    this.clearTimer()
  }

  private scheduleReconnect() {
    if (this.retryCount >= this.maxRetries) return

    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 15000)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.retryCount += 1
      this.callbacks.onReconnect?.()
    }, delay)
  }

  private clearTimer() {
    if (!this.reconnectTimer) return
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }
}
