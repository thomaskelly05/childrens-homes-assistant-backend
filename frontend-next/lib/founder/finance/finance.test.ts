import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { clearAgentAuditTrail } from '../agents/autonomous/founder-agent-audit.ts'
import { resetFinanceStore } from './finance-store.ts'
import { createFinanceSnapshot, addManualCostEntry } from './finance-service.ts'
import { generateFinanceForecast } from './finance-forecast-engine.ts'

beforeEach(() => {
  resetFinanceStore()
  clearAgentAuditTrail()
})

describe('Finance Agent', () => {
  it('labels estimated costs when no manual entries exist', () => {
    const snapshot = createFinanceSnapshot('test')
    assert.equal(snapshot.monthlyBurnLabel, 'estimated')
    assert.equal(snapshot.estimatedCosts.label, 'estimated')
  })

  it('uses actual label when manual cost entries exist', () => {
    addManualCostEntry({
      category: 'hosting',
      amountGbp: 200,
      description: 'Render hosting',
      label: 'actual',
      createdBy: 'founder'
    })
    const snapshot = createFinanceSnapshot('test')
    assert.equal(snapshot.monthlyBurnLabel, 'actual')
    assert.ok(snapshot.monthlyBurn >= 200)
  })

  it('forecast separates projected from assumed inputs', () => {
    const forecast = generateFinanceForecast(
      { monthlyUsers: 100, pricePerUserGbp: 30, monthlyBurnGbp: 600 },
      'founder'
    )
    assert.equal(forecast.assumptions.pricePerUserGbp.label, 'assumed')
    assert.equal(forecast.projectedMrr.label, 'projected')
    assert.ok(forecast.breakEvenUsers !== null)
  })
})
