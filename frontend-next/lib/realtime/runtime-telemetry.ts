export type RuntimeTelemetryEvent = {
  type: string
  timestamp: string
  metadata?: Record<string, unknown>
}

class RuntimeTelemetry {
  private events: RuntimeTelemetryEvent[] = []
  private maxEvents = 500

  track(type: string, metadata?: Record<string, unknown>) {
    const event: RuntimeTelemetryEvent = {
      type,
      timestamp: new Date().toISOString(),
      metadata
    }

    this.events.unshift(event)
    this.events = this.events.slice(0, this.maxEvents)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'indicare_assistant_runtime_telemetry',
          JSON.stringify(this.events)
        )
      } catch {
        // ignore telemetry persistence failures
      }
    }

    console.info('[IndiCare Runtime]', type, metadata || {})
  }

  list() {
    return this.events
  }

  hydrate() {
    if (typeof window === 'undefined') return

    try {
      const stored = JSON.parse(
        localStorage.getItem('indicare_assistant_runtime_telemetry') || '[]'
      )

      if (Array.isArray(stored)) {
        this.events = stored
      }
    } catch {
      this.events = []
    }
  }
}

export const runtimeTelemetry = new RuntimeTelemetry()
