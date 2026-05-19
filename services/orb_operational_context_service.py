from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extras import RealDictCursor

from repositories.actions_repository import list_actions
from repositories.documents_repository import list_documents
from repositories.evidence_repository import list_evidence
from repositories.os_repository_utils import (
    current_allowed_home_ids,
    current_home_id,
    current_provider_id,
    quote_ident,
    safe_int,
    table_exists,
)
from repositories.reports_repository import list_reports
from repositories.workspaces_repository import get_young_person, list_young_people
from services.governance_intelligence_service import GovernanceIntelligenceService
from services.db_pool_monitor import db_pool_snapshot
from services.orb_care_journey_service import OrbCareJourneyService
from services.os_chronology_service import list_chronology_for_connection
from services.orb_regulatory_reasoning_service import OrbRegulatoryReasoningService
from services.orb_response_composer import OrbResponseComposer
from services.orb_therapeutic_reasoning_service import OrbTherapeuticReasoningService
from services.orb_emotional_state_service import orb_emotional_state_service
from services.orb_emotional_safety_service import orb_emotional_safety_service
from services.orb_risk_intelligence_service import orb_risk_intelligence_service
from services.workforce_intelligence_service import WorkforceIntelligenceService

VALID_SCOPES = {"home", "child", "workforce", "governance", "inspection", "provider"}
GUARDRAILS = [
    "ORB supports registered manager and safeguarding review; it does not replace professional judgement.",
    "ORB must not predict Ofsted grades or make final safeguarding decisions.",
    "Draft wording, actions and report text require adult/manager review before use.",
]

# existing file content unchanged below...
