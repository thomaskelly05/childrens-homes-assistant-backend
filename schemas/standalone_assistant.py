from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AssistantProductMode(StrEnum):
    OS_ORB = "os_orb"
    STANDALONE_ASSISTANT = "standalone_assistant"


class StandaloneBrain(StrEnum):
    GENERAL_ASSISTANT = "general_assistant"
    CHILDRENS_HOMES_EXPERT = "childrens_homes_expert"
    OFSTED_SCCIF_COACH = "ofsted_sccif_coach"
    REPORT_WRITER = "report_writer"
    POLICY_PROCEDURE_WRITER = "policy_procedure_writer"
    PRODUCTIVITY_ASSISTANT = "productivity_assistant"
    VOICE_ASSISTANT = "voice_assistant"


class StandaloneToolRoute(StrEnum):
    GENERAL_QA = "general_qa"
    WRITING = "writing"
    SUMMARISE_UPLOAD = "summarise_upload"
    WEB_SEARCH = "web_search"
    WEATHER = "weather"
    SPORTS = "sports"
    CALCULATION = "calculation"
    PLANNING = "planning"
    DOCUMENT_DRAFT = "document_draft"


class StaticKnowledgeCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    source_type: Literal["static_regulation", "static_framework", "static_guidance", "uploaded_source"] = "static_guidance"
    source_id: str
    excerpt: str | None = None
    route: None = None
    confidence: Literal["low", "medium", "high"] = "medium"


class StandaloneAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=20000)
    brain: StandaloneBrain = StandaloneBrain.GENERAL_ASSISTANT
    conversation_id: str | None = None
    project_id: str | None = None
    uploaded_sources: list[dict[str, Any]] = Field(default_factory=list)


class StandaloneAssistantResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str
    citations: list[StaticKnowledgeCitation] = Field(default_factory=list)
    tool_route: StandaloneToolRoute = StandaloneToolRoute.GENERAL_QA
    follow_up_questions: list[str] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"] = "medium"
    review_required: bool = True
