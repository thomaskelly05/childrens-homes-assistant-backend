import type { FounderOperatingLoopPlan } from './operating-loop-types'
import {
  BRAND_OPERATING_LOOP_PLAN,
  FULL_OPERATING_LOOP_PLAN,
  QUALITY_OPERATING_LOOP_PLAN,
  TECHNICAL_OPERATING_LOOP_PLAN
} from './operating-loop-types'

function normalise(question: string): string {
  return question.trim().toLowerCase().replace(/['']/g, "'")
}

function matches(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question))
}

export function getOperatingLoopPlanForQuestion(question: string): FounderOperatingLoopPlan {
  const q = normalise(question)
  if (matches(q, [/brand loop/])) return BRAND_OPERATING_LOOP_PLAN
  if (matches(q, [/quality loop/])) return QUALITY_OPERATING_LOOP_PLAN
  if (matches(q, [/technical loop/])) return TECHNICAL_OPERATING_LOOP_PLAN
  if (matches(q, [/product loop/])) {
    return {
      runQualitySample: false,
      runStaffAgents: true,
      generateActions: true,
      generateContentDrafts: false,
      generateBuildBriefs: false,
      generateApprovals: false
    }
  }
  return FULL_OPERATING_LOOP_PLAN
}
