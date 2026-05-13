export function routeToAction(id: string) {
  return `/actions/${encodeURIComponent(id)}`
}

export function routeToEvidence(id: string) {
  return `/evidence/${encodeURIComponent(id)}`
}

export function routeToChronologyEvent(id: string) {
  return `/chronology/${encodeURIComponent(id)}`
}

export function routeToYoungPersonWorkspace(id: string) {
  return `/young-people/${encodeURIComponent(id)}/workspace`
}

export function routeToSourceRecord(sourceType: string, sourceId: string) {
  const encoded = encodeURIComponent(sourceId)
  if (sourceType === 'daily_log' || sourceType === 'care_record') return `/daily-logs/${encoded}`
  if (sourceType === 'incident') return `/incidents/${encoded}`
  if (sourceType === 'safeguarding') return `/safeguarding/${encoded}`
  if (sourceType === 'risk_assessment' || sourceType === 'risk_review') return `/risk-assessments/${encoded}`
  if (sourceType === 'document' || sourceType.includes('document') || sourceType.includes('reg44')) return `/documents/${encoded}`
  if (sourceType === 'report' || sourceType.includes('report')) return `/reports/${encoded}`
  if (sourceType === 'evidence') return `/evidence/${encoded}`
  if (sourceType.includes('action') || sourceType === 'task') return `/actions/${encoded}`
  return routeToChronologyEvent(`${sourceType}:${sourceId}`)
}
