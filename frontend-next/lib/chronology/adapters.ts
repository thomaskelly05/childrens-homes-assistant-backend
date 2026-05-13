import { indicareData } from '@/lib/indicare/demo-data'

import { demoChronologyEvents } from './demo-data'
import { ChronologyEvent } from './types'

export type ChronologyRepository = {
  listEvents: () => Promise<ChronologyEvent[]>
  getEvent: (id: string) => Promise<ChronologyEvent | undefined>
}

export const demoChronologyRepository: ChronologyRepository = {
  async listEvents() {
    return demoChronologyEvents
  },
  async getEvent(id: string) {
    return demoChronologyEvents.find((event) => event.id === id)
  }
}

export function mapLegacyRecordCountsToChronologySummary() {
  return {
    dailyLogs: indicareData.dailyLogs.length,
    incidents: indicareData.incidents.length,
    safeguarding: indicareData.safeguardingEvents.length,
    medication: indicareData.medicationRecords.length,
    keywork: indicareData.keyworkSessions.length,
    appointments: indicareData.appointments.length,
    documents: indicareData.documents.length,
    mappedChronologyEvents: demoChronologyEvents.length,
    adapterStatus: 'Demo repository in use; replace with backend chronology API when persistence is ready.'
  }
}

export function chronologyApiAdapter(baseUrl = '/api/chronology'): ChronologyRepository {
  return {
    async listEvents() {
      const response = await fetch(baseUrl)
      if (!response.ok) throw new Error('Unable to load chronology events')
      return response.json() as Promise<ChronologyEvent[]>
    },
    async getEvent(id: string) {
      const response = await fetch(`${baseUrl}/${id}`)
      if (response.status === 404) return undefined
      if (!response.ok) throw new Error('Unable to load chronology event')
      return response.json() as Promise<ChronologyEvent>
    }
  }
}
