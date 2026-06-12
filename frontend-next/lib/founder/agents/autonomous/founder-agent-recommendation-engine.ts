import type { FounderAgentEvent, FounderAgentEventType } from './founder-agent-event-types'
import type {
  FounderAgentActionType,
  FounderAgentId,
  FounderAgentRiskLevel
} from './founder-agent-types'

export type RecommendationDraft = {
  recommendation: string
  rationale: string
  riskLevel: FounderAgentRiskLevel
  proposedAction: FounderAgentActionType
  approvalRequired: boolean
}

const EVALUATION_FAILURE_TYPES: FounderAgentEventType[] = [
  'evaluation_run_failed',
  'critical_failure_detected',
  'high_risk_failure_detected',
  'adversarial_failure_detected'
]

const CONTENT_RELATIONSHIP_TYPES: FounderAgentEventType[] = [
  'content_milestone_reached',
  'demo_request_received',
  'pilot_feedback_received'
]

function isEvaluationFailure(event: FounderAgentEvent): boolean {
  return EVALUATION_FAILURE_TYPES.includes(event.type)
}

function isTechnicalFailure(event: FounderAgentEvent): boolean {
  return ['deploy_failed', 'build_failed', 'api_error_detected', 'provider_error_detected'].includes(event.type)
}

function isLaunchGateBlocker(event: FounderAgentEvent): boolean {
  return ['launch_gate_blocked', 'privacy_review_missing', 'retention_review_missing', 'gold_run_missing'].includes(
    event.type
  )
}

function isWeakCoverage(event: FounderAgentEvent): boolean {
  return event.type === 'coverage_area_weak' || event.type === 'scenario_generation_recommended'
}

export function generateRecommendationForAgent(
  event: FounderAgentEvent,
  agentId: FounderAgentId
): RecommendationDraft | null {
  if (agentId === 'founder-chief-of-staff') {
    return {
      recommendation: `Chief of Staff: prioritise review of "${event.title}".`,
      rationale: event.summary,
      riskLevel: event.severity === 'critical' ? 'critical' : event.severity === 'high' ? 'high' : 'medium',
      proposedAction: 'create_audit_note',
      approvalRequired: false
    }
  }

  if (isEvaluationFailure(event)) {
    if (agentId === 'orb-quality-agent') {
      return {
        recommendation: 'Detect evaluation weakness and recommend IndiCare Learning Loop.',
        rationale: `Event ${event.type} on run ${event.relatedRunId ?? 'unknown'}. Start learning loop for synthetic evidence analysis. Do not weaken safety thresholds.`,
        riskLevel: event.severity === 'critical' ? 'critical' : 'high',
        proposedAction: 'generate_build_brief',
        approvalRequired: true
      }
    }
    if (agentId === 'safeguarding-agent') {
      return {
        recommendation: 'Review safeguarding-related failures — child remains central.',
        rationale: 'Critical or high-risk safeguarding signal detected. Professional judgement required.',
        riskLevel: 'high',
        proposedAction: 'analyse_latest_run',
        approvalRequired: true
      }
    }
    if (agentId === 'product-agent') {
      return {
        recommendation: 'Suggest product/UX build brief from failure patterns.',
        rationale: 'Failure may indicate product gap — prepare brief only.',
        riskLevel: 'medium',
        proposedAction: 'create_product_build_brief',
        approvalRequired: true
      }
    }
    if (agentId === 'technical-agent') {
      return {
        recommendation: 'Check for infrastructure-related failures before classifying as safety failure.',
        rationale: 'Distinguish technical errors from safeguarding failures.',
        riskLevel: 'medium',
        proposedAction: 'create_technical_fix_brief',
        approvalRequired: true
      }
    }
  }

  if (isLaunchGateBlocker(event)) {
    if (agentId === 'governance-agent') {
      return {
        recommendation: `Identify missing blocker: ${event.title}. Do not mark launch ready.`,
        rationale: event.summary,
        riskLevel: 'high',
        proposedAction:
          event.type === 'privacy_review_missing'
            ? 'prepare_privacy_review_prompt'
            : event.type === 'retention_review_missing'
              ? 'prepare_retention_review_prompt'
              : 'create_risk_register_entry',
        approvalRequired: true
      }
    }
    if (agentId === 'evidence-agent') {
      return {
        recommendation: 'Compile launch gate evidence — blockers must remain visible.',
        rationale: event.summary,
        riskLevel: 'high',
        proposedAction: 'prepare_launch_gate_evidence',
        approvalRequired: true
      }
    }
    if (agentId === 'orb-quality-agent') {
      return {
        recommendation: 'Suggest retest sequence after blocker resolution.',
        rationale: 'Launch gate blocked — recommend targeted retest, not broad pack without approval.',
        riskLevel: 'high',
        proposedAction: 'run_synthetic_evaluation',
        approvalRequired: true
      }
    }
  }

  if (isWeakCoverage(event)) {
    if (agentId === 'orb-quality-agent') {
      const area = (event.payload.weakArea as string) ?? 'coverage gap'
      return {
        recommendation: `Suggest new synthetic scenario set for ${area}.`,
        rationale: 'Weak coverage detected — synthetic scenario IDs only. Large packs require approval.',
        riskLevel: 'medium',
        proposedAction: 'generate_synthetic_scenarios',
        approvalRequired: true
      }
    }
    if (agentId === 'product-agent') {
      return {
        recommendation: 'Identify product category and risk for weak coverage area.',
        rationale: event.summary,
        riskLevel: 'medium',
        proposedAction: 'create_product_build_brief',
        approvalRequired: true
      }
    }
    if (agentId === 'safeguarding-agent') {
      return {
        recommendation: 'Review safeguarding risk for untested or weak coverage category.',
        rationale: 'Coverage gap may hide safeguarding blind spot.',
        riskLevel: 'medium',
        proposedAction: 'analyse_latest_run',
        approvalRequired: true
      }
    }
  }

  if (isTechnicalFailure(event)) {
    if (agentId === 'technical-agent') {
      return {
        recommendation: 'Prepare technical fix brief — do not classify as safety failure.',
        rationale: `${event.type}: ${event.summary}`,
        riskLevel: event.severity === 'critical' ? 'high' : 'medium',
        proposedAction: 'create_technical_fix_brief',
        approvalRequired: true
      }
    }
  }

  if (event.type === 'deploy_completed') {
    if (agentId === 'orb-quality-agent') {
      return {
        recommendation: 'Recommend adversarial then high-risk synthetic evaluation after deploy.',
        rationale: 'Post-deploy verification — approval required before large pack runs.',
        riskLevel: 'medium',
        proposedAction: 'run_synthetic_evaluation',
        approvalRequired: true
      }
    }
    if (agentId === 'technical-agent') {
      return {
        recommendation: 'Confirm deploy health and monitor provider errors.',
        rationale: event.summary,
        riskLevel: 'low',
        proposedAction: 'create_audit_note',
        approvalRequired: false
      }
    }
  }

  if (event.type === 'evaluation_run_completed' && agentId === 'orb-quality-agent') {
    return {
      recommendation: 'Update coverage map and review pass/fail summary.',
      rationale: event.summary,
      riskLevel: (event.payload.criticalFailures as number) > 0 ? 'high' : 'low',
      proposedAction: 'update_coverage_map',
      approvalRequired: false
    }
  }

  if (event.type === 'new_pr_created' && agentId === 'orb-quality-agent') {
    return {
      recommendation: 'Draft PR summary prepared — awaiting founder approval before GitHub.',
      rationale: 'No auto-merge. Tom remains approval gate.',
      riskLevel: 'high',
      proposedAction: 'create_draft_pr_summary',
      approvalRequired: true
    }
  }

  if (event.type === 'pr_merged' && agentId === 'orb-quality-agent') {
    return {
      recommendation: 'Post-merge retest recommended for affected scenarios.',
      rationale: 'Verify fix did not regress safeguarding or coverage.',
      riskLevel: 'medium',
      proposedAction: 'run_synthetic_evaluation',
      approvalRequired: true
    }
  }

  if (CONTENT_RELATIONSHIP_TYPES.includes(event.type)) {
    if (agentId === 'content-agent' && event.type === 'content_milestone_reached') {
      return {
        recommendation: 'Draft content prepared — cannot auto-publish.',
        rationale: 'British English, child-centred, no exaggeration. Approval required before publishing.',
        riskLevel: 'medium',
        proposedAction: 'draft_linkedin_post',
        approvalRequired: true
      }
    }
    if (agentId === 'relationship-agent' && event.type === 'demo_request_received') {
      return {
        recommendation: 'Draft partner follow-up — cannot auto-send.',
        rationale: 'External message requires Tom approval. No real child data.',
        riskLevel: 'high',
        proposedAction: 'draft_partner_follow_up',
        approvalRequired: true
      }
    }
    if (agentId === 'revenue-agent' && event.type === 'demo_request_received') {
      return {
        recommendation: 'Commercial readiness note — observe only, no exaggerated claims.',
        rationale: event.summary,
        riskLevel: 'low',
        proposedAction: 'create_audit_note',
        approvalRequired: false
      }
    }
    if (agentId === 'pilot-agent' && event.type === 'pilot_feedback_received') {
      return {
        recommendation: 'Compile pilot feedback summary for founder review.',
        rationale: 'Synthetic/anonymised feedback only.',
        riskLevel: 'medium',
        proposedAction: 'create_pilot_summary',
        approvalRequired: true
      }
    }
    if (agentId === 'product-agent' && event.type === 'pilot_feedback_received') {
      return {
        recommendation: 'Translate pilot feedback into product improvement brief.',
        rationale: event.summary,
        riskLevel: 'medium',
        proposedAction: 'create_product_build_brief',
        approvalRequired: true
      }
    }
    if (agentId === 'evidence-agent' && event.type === 'pilot_feedback_received') {
      return {
        recommendation: 'Record pilot evidence in improvement trail.',
        rationale: event.summary,
        riskLevel: 'low',
        proposedAction: 'create_audit_note',
        approvalRequired: false
      }
    }
  }

  if (agentId === 'technical-agent' && event.type === 'provider_error_detected') {
    return {
      recommendation: 'Investigate provider error (431/502/429) — technical fix brief recommended.',
      rationale: event.summary,
      riskLevel: 'medium',
      proposedAction: 'create_technical_fix_brief',
      approvalRequired: true
    }
  }

  if (agentId === 'governance-agent' && event.type === 'privacy_review_missing') {
    return {
      recommendation: 'Privacy review missing — complete before launch gate sign-off.',
      rationale: event.summary,
      riskLevel: 'high',
      proposedAction: 'prepare_privacy_review_prompt',
      approvalRequired: true
    }
  }

  return null
}

export function shouldCreateDraftPrForFailure(event: FounderAgentEvent): boolean {
  return isEvaluationFailure(event) && event.severity !== 'info'
}

export function contentRecommendationCannotAutoPublish(action: FounderAgentActionType): boolean {
  return ['draft_linkedin_post', 'draft_founder_update'].includes(action)
}

export function relationshipRecommendationCannotAutoSend(action: FounderAgentActionType): boolean {
  return ['draft_provider_email', 'draft_partner_follow_up'].includes(action)
}
