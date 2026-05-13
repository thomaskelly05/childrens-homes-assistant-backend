import { osGet } from './client'
import type { OsApiResult } from './types'

export type ManagementOversight = {
  cards: Record<string, number>
  escalation_queue: Record<string, unknown>[]
  review_queue: Record<string, unknown>[]
  sign_off_queue: Record<string, unknown>[]
  compliance_heatmap: { areas: Record<string, unknown>[] }
  risk_indicators: { key: string; label: string; count: number }[]
}

export async function getOsManagementOversight(): Promise<OsApiResult<ManagementOversight>> {
  return osGet<ManagementOversight>('/os/management/oversight', {
    cards: {},
    escalation_queue: [],
    review_queue: [],
    sign_off_queue: [],
    compliance_heatmap: { areas: [] },
    risk_indicators: []
  })
}
