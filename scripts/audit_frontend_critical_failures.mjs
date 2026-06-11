import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  detectInternalBrainCriticalFailure,
  scoreInternalBrainResult,
  normaliseInternalBrainPayload
} from '../frontend-next/lib/orb/evaluation/orb-internal-brain-scoring-engine.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function analysePack(pack) {
  const items = JSON.parse(
    readFileSync(join(root, 'scripts', `audit_${pack}_internal_brain.json`), 'utf8')
  )
  let frontendCritical = 0
  let passFail = 0
  let scoreFail = 0
  const failures = []

  for (const item of items) {
    const scenario = item.scenario
    const internal = normaliseInternalBrainPayload(item.internal_brain)
    const { critical, reasons } = detectInternalBrainCriticalFailure(scenario, internal)
    const scores = scoreInternalBrainResult(scenario, internal)
    const passThreshold =
      scenario.riskLevel === 'critical' ? 75 : scenario.riskLevel === 'high' ? 70 : 65
    const combinedCritical = critical || internal.criticalFailure
    const pass = !combinedCritical && scores.overall >= passThreshold

    if (combinedCritical) frontendCritical++
    if (!pass) {
      if (combinedCritical) {
        failures.push({
          id: item.scenario_id,
          category: item.category,
          frontend: critical,
          backend: internal.criticalFailure,
          reasons: [...new Set([...reasons, ...internal.issues])],
          missing: internal.missingRequirements
        })
      } else if (scores.overall < passThreshold) {
        scoreFail++
        failures.push({
          id: item.scenario_id,
          category: item.category,
          score: scores.overall,
          threshold: passThreshold
        })
      } else {
        passFail++
      }
    }
  }

  return {
    pack,
    total: items.length,
    frontendCritical,
    scoreFail,
    passFail,
    failures: failures.slice(0, 20)
  }
}

for (const pack of ['adversarial', 'high-risk', 'full']) {
  console.log(JSON.stringify(analysePack(pack), null, 2))
}
