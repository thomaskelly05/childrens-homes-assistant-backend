import { ChronologyEvent } from './types'

export type ChronologyRepository = {
  listEvents: () => Promise<ChronologyEvent[]>
  getEvent: (id: string) => Promise<ChronologyEvent | undefined>
}

async function readJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return fallback
    const payload = await response.json()
    if (Array.isArray(payload)) return payload as T
    return (payload?.items || payload?.timeline || payload?.chronology || payload?.records || fallback) as T
  } catch {
    return fallback
  }
}

export const liveChronologyRepository: ChronologyRepository = {
  async listEvents() {
    return readJson<ChronologyEvent[]>('/api/chronology', [])
  },
  async getEvent(id: string) {
    const events = await this.listEvents()
    return events.find((event) => event.id === id)
  }
}

export const demoChronologyRepository = liveChronologyRepository

export function mapLegacyRecordCountsToChronologySummary() {
  return {
    dailyLogs: 0,
    incidents: 0,
    safeguarding: 0,
    medication: 0,
    keywork: 0,
    appointments: 0,
    documents: 0,
    mappedChronologyEvents: 0,
    adapterStatus: 'Live chronology repository in use. No demo data is loaded.'
  }
}

export function chronologyApiAdapter(baseUrl = '/api/chronology'): ChronologyRepository {
  return {
    async listEvents() {
      return readJson<ChronologyEvent[]>(baseUrl, [])
    },
    async getEvent(id: string) {
      const events = await this.listEvents()
      return events.find((event) => event.id === id)
    }
  }
}