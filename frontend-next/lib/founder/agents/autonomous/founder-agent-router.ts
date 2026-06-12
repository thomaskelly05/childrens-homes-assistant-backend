import type { FounderAgentEventType } from './founder-agent-event-types'
import type { FounderAgentId } from './founder-agent-types'

const EVENT_AGENT_ROUTING: Record<FounderAgentEventType, FounderAgentId[]> = {
  evaluation_run_completed: ['orb-quality-agent', 'founder-chief-of-staff'],
  evaluation_run_failed: ['orb-quality-agent', 'technical-agent', 'founder-chief-of-staff'],
  critical_failure_detected: ['orb-quality-agent', 'safeguarding-agent', 'founder-chief-of-staff'],
  high_risk_failure_detected: ['orb-quality-agent', 'safeguarding-agent', 'product-agent', 'founder-chief-of-staff'],
  adversarial_failure_detected: ['orb-quality-agent', 'safeguarding-agent', 'technical-agent', 'founder-chief-of-staff'],
  gold_run_missing: ['orb-quality-agent', 'evidence-agent', 'founder-chief-of-staff'],
  launch_gate_blocked: ['evidence-agent', 'governance-agent', 'orb-quality-agent', 'founder-chief-of-staff'],
  privacy_review_missing: ['governance-agent', 'founder-chief-of-staff'],
  retention_review_missing: ['governance-agent', 'founder-chief-of-staff'],
  coverage_area_weak: ['orb-quality-agent', 'product-agent', 'safeguarding-agent'],
  deploy_completed: ['technical-agent', 'orb-quality-agent', 'founder-chief-of-staff'],
  deploy_failed: ['technical-agent', 'founder-chief-of-staff'],
  build_failed: ['technical-agent', 'founder-chief-of-staff'],
  api_error_detected: ['technical-agent', 'founder-chief-of-staff'],
  provider_error_detected: ['technical-agent', 'founder-chief-of-staff'],
  new_pr_created: ['orb-quality-agent', 'founder-chief-of-staff'],
  pr_merged: ['orb-quality-agent', 'technical-agent', 'founder-chief-of-staff'],
  pilot_feedback_received: ['pilot-agent', 'product-agent', 'evidence-agent'],
  demo_request_received: ['relationship-agent', 'revenue-agent', 'founder-chief-of-staff'],
  content_milestone_reached: ['content-agent', 'founder-chief-of-staff'],
  scenario_generation_recommended: ['orb-quality-agent', 'product-agent', 'safeguarding-agent']
}

export function routeEventToAgents(eventType: FounderAgentEventType): FounderAgentId[] {
  return [...(EVENT_AGENT_ROUTING[eventType] ?? ['founder-chief-of-staff'])]
}

export function getEventAgentRouting(): typeof EVENT_AGENT_ROUTING {
  return { ...EVENT_AGENT_ROUTING }
}
