export function routeToAction(id: string) {
  return `/actions/${encodeURIComponent(id)}`
}

export function routeToEvidence(id: string) {
  return `/evidence/${encodeURIComponent(id)}`
}

export function routeToChronologyEvent(id: string) {
  return `/chronology/${encodeURIComponent(id)}`
}
