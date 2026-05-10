from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# =========================================================
# Shared base
# =========================================================


class AcademySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")


# =========================================================
# Common reference / summary models
# =========================================================


class AcademyUserSummary(AcademySchema):
    id: int
    first_name: str
    last_name: str
    email: EmailStr | str
    role: str
    primary_home_id: int | None = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class AcademyHomeSummary(AcademySchema):
    id: int
    provider_id: int
    name: str
    code: str | None = None


class AcademyCategorySummary(AcademySchema):
    id: int
    code: str
    name: str
    description: str | None = None
    sort_order: int = 0
    active: bool = True


class AcademyBadgeSummary(AcademySchema):
    label: str
    tone: Literal["neutral", "primary", "success", "warning", "danger"] = "neutral"


# =========================================================
# Modules
# =========================================================


ModuleLearningType = Literal[
    "training",
    "qualification_support",
    "cpd",
    "policy",
]

ModuleDifficulty = Literal[
    "induction",
    "core",
    "advanced",
    "manager",
]

SccifDomainCode = Literal[
    "experiences_progress",
    "help_and_protection",
    "leadership_management",
]


class AcademyModuleBase(AcademySchema):
    category_id: int | None = None
    code: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=255)
    summary: str | None = None
    description: str | None = None
    sccif_domain_code: SccifDomainCode
    learning_type: ModuleLearningType = "training"
    difficulty_level: ModuleDifficulty = "core"
    estimated_minutes: int = Field(default=30, ge=1, le=1440)
    active: bool = True
    version: int = Field(default=1, ge=1)
    requires_quiz: bool = True
    requires_workbook: bool = True
    requires_assessor_review: bool = False
    requires_manager_signoff: bool = False
    certificate_on_completion: bool = True
    renewal_months: int | None = Field(default=None, ge=1, le=120)


class AcademyModuleCreate(AcademyModuleBase):
    pass


class AcademyModuleUpdate(AcademySchema):
    category_id: int | None = None
    code: str | None = Field(default=None, min_length=1, max_length=100)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = None
    description: str | None = None
    sccif_domain_code: SccifDomainCode | None = None
    learning_type: ModuleLearningType | None = None
    difficulty_level: ModuleDifficulty | None = None
    estimated_minutes: int | None = Field(default=None, ge=1, le=1440)
    active: bool | None = None
    version: int | None = Field(default=None, ge=1)
    requires_quiz: bool | None = None
    requires_workbook: bool | None = None
    requires_assessor_review: bool | None = None
    requires_manager_signoff: bool | None = None
    certificate_on_completion: bool | None = None
    renewal_months: int | None = Field(default=None, ge=1, le=120)


class AcademyModuleSummary(AcademyModuleBase):
    id: int
    category_name: str | None = None
    progress_status: str | None = None
    progress_percent: int | None = Field(default=None, ge=0, le=100)
    mandatory: bool | None = None
    due_date: date | None = None
    is_overdue: bool = False
    is_expired: bool = False


class AcademyLessonSummary(AcademySchema):
    id: int
    module_id: int
    title: str
    lesson_type: Literal[
        "reading",
        "video",
        "scenario",
        "quiz_intro",
        "reflection",
        "resource",
        "download",
    ]
    sort_order: int = 0
    estimated_minutes: int = 10
    is_required: bool = True
    version: int = 1


class AcademyQuizSummary(AcademySchema):
    id: int
    module_id: int
    title: str
    pass_mark_percent: int = Field(..., ge=1, le=100)
    max_attempts: int | None = Field(default=None, ge=1)
    randomise_questions: bool = False
    version: int = 1


class AcademyModuleMappingSummary(AcademySchema):
    quality_standard_id: int | None = None
    quality_standard_code: str | None = None
    quality_standard_name: str | None = None
    regulation_ref_id: int | None = None
    regulation_number: int | None = None
    regulation_title: str | None = None
    ofsted_theme_id: int | None = None
    ofsted_theme_code: str | None = None
    ofsted_theme_name: str | None = None
    mapping_note: str | None = None


class AcademyModuleDetail(AcademyModuleSummary):
    lessons: list[AcademyLessonSummary] = Field(default_factory=list)
    quiz: AcademyQuizSummary | None = None
    mappings: list[AcademyModuleMappingSummary] = Field(default_factory=list)
    workbooks: list["AcademyWorkbookSummary"] = Field(default_factory=list)


# =========================================================
# Workbooks
# =========================================================


WorkbookType = Literal[
    "training",
    "qualification_unit",
    "knowledge",
    "reflection",
    "scenario",
    "observation",
    "professional_discussion",
]

WorkbookSectionType = Literal[
    "intro",
    "knowledge",
    "scenario",
    "reflection",
    "workplace_evidence",
    "observation",
    "witness_testimony",
    "professional_discussion",
    "action_plan",
    "declaration",
    "assessor_feedback",
]

WorkbookResponseType = Literal[
    "long_text",
    "short_text",
    "boolean",
    "single_select",
    "multi_select",
    "date",
    "file_upload",
    "evidence_link",
]

WorkbookSubmissionStatus = Literal[
    "draft",
    "submitted",
    "under_review",
    "needs_amendment",
    "accepted",
    "completed",
    "locked",
]

AssessmentDecision = Literal[
    "pending",
    "refer",
    "pass",
    "resubmit",
]


class AcademyWorkbookBase(AcademySchema):
    qualification_unit_id: int | None = None
    module_id: int | None = None
    code: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=255)
    workbook_type: WorkbookType
    version: int = Field(default=1, ge=1)
    is_assessable: bool = True
    requires_assessor_review: bool = True
    requires_manager_confirmation: bool = False
    active: bool = True

    @model_validator(mode="after")
    def validate_parent(self) -> "AcademyWorkbookBase":
        if not self.qualification_unit_id and not self.module_id:
            raise ValueError("Workbook must belong to a qualification unit or a module.")
        return self


class AcademyWorkbookCreate(AcademyWorkbookBase):
    pass


class AcademyWorkbookUpdate(AcademySchema):
    qualification_unit_id: int | None = None
    module_id: int | None = None
    code: str | None = Field(default=None, min_length=1, max_length=100)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    workbook_type: WorkbookType | None = None
    version: int | None = Field(default=None, ge=1)
    is_assessable: bool | None = None
    requires_assessor_review: bool | None = None
    requires_manager_confirmation: bool | None = None
    active: bool | None = None


class AcademyWorkbookSummary(AcademyWorkbookBase):
    id: int
    submission_id: int | None = None
    submission_status: WorkbookSubmissionStatus | None = None
    due_date: date | None = None
    is_overdue: bool = False


class AcademyWorkbookSectionSummary(AcademySchema):
    id: int
    workbook_id: int
    title: str
    guidance_text: str | None = None
    section_type: WorkbookSectionType
    sort_order: int = 0
    required: bool = True


class AcademyWorkbookQuestionSummary(AcademySchema):
    id: int
    section_id: int
    prompt_text: str
    response_type: WorkbookResponseType
    guidance_text: str | None = None
    min_words: int | None = Field(default=None, ge=0)
    max_words: int | None = Field(default=None, ge=1)
    required: bool = True
    sort_order: int = 0
    answer_text: str | None = None
    answer_json: dict[str, Any] | None = None


class AcademyWorkbookSectionDetail(AcademyWorkbookSectionSummary):
    questions: list[AcademyWorkbookQuestionSummary] = Field(default_factory=list)


class AcademyWorkbookDetail(AcademyWorkbookSummary):
    sections: list[AcademyWorkbookSectionDetail] = Field(default_factory=list)
    feedback: list["AcademyWorkbookFeedbackSummary"] = Field(default_factory=list)


class AcademyWorkbookSubmissionBase(AcademySchema):
    workbook_id: int
    user_id: int
    qualification_enrolment_id: int | None = None
    assigned_by_user_id: int | None = None
    assessor_user_id: int | None = None
    status: WorkbookSubmissionStatus = "draft"
    attempt_number: int = Field(default=1, ge=1)
    due_date: date | None = None


class AcademyWorkbookSubmissionCreate(AcademySchema):
    qualification_enrolment_id: int | None = None
    due_date: date | None = None


class AcademyWorkbookSubmissionUpdate(AcademySchema):
    status: WorkbookSubmissionStatus | None = None
    assessor_user_id: int | None = None
    assessor_decision: AssessmentDecision | None = None
    assessor_summary: str | None = None
    due_date: date | None = None
    manager_confirmed_by_user_id: int | None = None


class AcademyWorkbookSubmissionSummary(AcademyWorkbookSubmissionBase):
    id: int
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    completed_at: datetime | None = None
    assessor_decision: AssessmentDecision | None = None
    assessor_summary: str | None = None
    manager_confirmed_by_user_id: int | None = None
    manager_confirmed_at: datetime | None = None
    locked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = False


class AcademyWorkbookAnswerInput(AcademySchema):
    question_id: int
    answer_text: str | None = None
    answer_json: dict[str, Any] | None = None


class AcademyWorkbookAnswersSaveRequest(AcademySchema):
    answers: list[AcademyWorkbookAnswerInput] = Field(default_factory=list)


class AcademyWorkbookFeedbackSummary(AcademySchema):
    id: int
    submission_id: int
    feedback_by_user_id: int
    feedback_type: Literal["assessor", "manager", "iqa", "general"]
    feedback_text: str
    created_at: datetime


class AcademyWorkbookReviewRequest(AcademySchema):
    decision: Literal["pass", "refer", "resubmit", "insufficient_evidence"]
    feedback_text: str = Field(..., min_length=1)
    status: Literal["under_review", "needs_amendment", "accepted", "completed"]


# =========================================================
# Evidence
# =========================================================


EvidenceType = Literal[
    "uploaded_document",
    "image",
    "observation",
    "witness_testimony",
    "professional_discussion",
    "certificate",
    "note",
    "linked_record",
]


class AcademyEvidenceBase(AcademySchema):
    evidence_type: EvidenceType
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    file_url: str | None = None
    external_reference: str | None = None
    evidence_date: date | None = None


class AcademyEvidenceCreate(AcademyEvidenceBase):
    pass


class AcademyEvidenceUpdate(AcademySchema):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    file_url: str | None = None
    external_reference: str | None = None
    evidence_date: date | None = None


class AcademyEvidenceSummary(AcademyEvidenceBase):
    id: int
    user_id: int
    created_by_user_id: int | None = None
    created_at: datetime


class AcademyEvidenceLinkRequest(AcademySchema):
    workbook_submission_id: int | None = None
    qualification_unit_id: int | None = None
    module_id: int | None = None
    competency_id: int | None = None

    @model_validator(mode="after")
    def validate_target(self) -> "AcademyEvidenceLinkRequest":
        if not any(
            [
                self.workbook_submission_id,
                self.qualification_unit_id,
                self.module_id,
                self.competency_id,
            ]
        ):
            raise ValueError("At least one evidence link target must be provided.")
        return self


class AcademyEvidenceReviewRequest(AcademySchema):
    decision: Literal["accepted", "rejected", "needs_more_detail"]
    comments: str | None = None


# =========================================================
# Qualifications
# =========================================================


QualificationType = Literal["diploma", "certificate", "award"]
QualificationEnrolmentStatus = Literal[
    "enrolled",
    "in_progress",
    "on_hold",
    "completed",
    "withdrawn",
]
UnitProgressStatus = Literal[
    "not_started",
    "in_progress",
    "submitted",
    "under_review",
    "needs_amendment",
    "completed",
]


class AcademyQualificationBase(AcademySchema):
    code: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=255)
    level: Literal[3, 5]
    awarding_body: str = Field(..., min_length=1, max_length=255)
    qualification_type: QualificationType = "diploma"
    description: str | None = None
    total_credits: int | None = Field(default=None, ge=1)
    active: bool = True
    version: int = Field(default=1, ge=1)


class AcademyQualificationCreate(AcademyQualificationBase):
    pass


class AcademyQualificationUpdate(AcademySchema):
    code: str | None = Field(default=None, min_length=1, max_length=100)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    level: Literal[3, 5] | None = None
    awarding_body: str | None = Field(default=None, min_length=1, max_length=255)
    qualification_type: QualificationType | None = None
    description: str | None = None
    total_credits: int | None = Field(default=None, ge=1)
    active: bool | None = None
    version: int | None = Field(default=None, ge=1)


class AcademyQualificationSummary(AcademyQualificationBase):
    id: int
    enrolment_status: QualificationEnrolmentStatus | None = None
    completion_percent: float | None = None


class AcademyQualificationUnitBase(AcademySchema):
    qualification_id: int
    unit_code: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=255)
    credit_value: int | None = Field(default=None, ge=1)
    guided_learning_hours: int | None = Field(default=None, ge=1)
    mandatory: bool = True
    summary: str | None = None
    learning_outcomes_json: list[dict[str, Any]] | dict[str, Any] | None = None
    assessment_criteria_json: list[dict[str, Any]] | dict[str, Any] | None = None
    sort_order: int = 0
    version: int = Field(default=1, ge=1)
    active: bool = True


class AcademyQualificationUnitCreate(AcademyQualificationUnitBase):
    pass


class AcademyQualificationUnitUpdate(AcademySchema):
    unit_code: str | None = Field(default=None, min_length=1, max_length=100)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    credit_value: int | None = Field(default=None, ge=1)
    guided_learning_hours: int | None = Field(default=None, ge=1)
    mandatory: bool | None = None
    summary: str | None = None
    learning_outcomes_json: list[dict[str, Any]] | dict[str, Any] | None = None
    assessment_criteria_json: list[dict[str, Any]] | dict[str, Any] | None = None
    sort_order: int | None = None
    version: int | None = Field(default=None, ge=1)
    active: bool | None = None


class AcademyQualificationUnitSummary(AcademyQualificationUnitBase):
    id: int
    progress_status: UnitProgressStatus | None = None
    assessor_decision: AssessmentDecision | None = None
    workbook_id: int | None = None
    workbook_title: str | None = None


class AcademyQualificationDetail(AcademyQualificationSummary):
    units: list[AcademyQualificationUnitSummary] = Field(default_factory=list)


class AcademyQualificationEnrolRequest(AcademySchema):
    user_id: int
    assessor_user_id: int | None = None
    iqa_user_id: int | None = None
    start_date: date | None = None
    target_end_date: date | None = None


class AcademyQualificationEnrolmentUpdate(AcademySchema):
    status: QualificationEnrolmentStatus | None = None
    assessor_user_id: int | None = None
    iqa_user_id: int | None = None
    target_end_date: date | None = None
    notes: str | None = None


class AcademyQualificationEnrolmentSummary(AcademySchema):
    id: int
    user_id: int
    qualification_id: int
    assessor_user_id: int | None = None
    iqa_user_id: int | None = None
    status: QualificationEnrolmentStatus
    start_date: date | None = None
    target_end_date: date | None = None
    achieved_date: date | None = None
    withdrawn_date: date | None = None
    notes: str | None = None
    completed_units: int = 0
    total_units: int = 0
    completion_percent: float = 0.0


# =========================================================
# Assessments / observations / competency
# =========================================================


CompetencyAssessmentMethod = Literal[
    "manager_observation",
    "discussion",
    "scenario_review",
    "quiz",
    "practical",
    "portfolio",
]

CompetencyOutcome = Literal[
    "competent",
    "not_yet_competent",
    "requires_review",
]


class AcademyObservationCreate(AcademySchema):
    user_id: int
    workbook_submission_id: int | None = None
    observation_title: str = Field(..., min_length=1, max_length=255)
    observation_text: str = Field(..., min_length=1)
    observed_at: datetime
    outcome: str | None = None


class AcademyProfessionalDiscussionCreate(AcademySchema):
    user_id: int
    workbook_submission_id: int | None = None
    discussion_title: str = Field(..., min_length=1, max_length=255)
    discussion_summary: str = Field(..., min_length=1)
    discussion_date: date
    outcome: str | None = None


class AcademyCompetencySummary(AcademySchema):
    id: int
    module_id: int | None = None
    qualification_unit_id: int | None = None
    code: str
    title: str
    description: str | None = None
    assessment_method: CompetencyAssessmentMethod
    required_for_completion: bool = True
    active: bool = True


class AcademyCompetencySignoffRequest(AcademySchema):
    user_id: int
    outcome: CompetencyOutcome
    notes: str | None = None
    expires_at: datetime | None = None


class AcademyCompetencySignoffSummary(AcademySchema):
    id: int
    competency_id: int
    user_id: int
    signed_off_by_user_id: int
    outcome: CompetencyOutcome
    notes: str | None = None
    signed_off_at: datetime
    expires_at: datetime | None = None


# =========================================================
# Certificates
# =========================================================


class AcademyCertificateSummary(AcademySchema):
    id: int
    user_id: int
    module_id: int | None = None
    qualification_id: int | None = None
    certificate_number: str
    title: str
    issued_at: datetime
    expires_at: datetime | None = None
    file_url: str | None = None


# =========================================================
# Dashboard / compliance
# =========================================================


class AcademyDashboardStats(AcademySchema):
    mandatory_modules_due: int = 0
    mandatory_modules_overdue: int = 0
    workbooks_in_progress: int = 0
    workbooks_needing_amendment: int = 0
    qualifications_active: int = 0
    certificates_held: int = 0


class AcademyDashboardItem(AcademySchema):
    id: int
    title: str
    subtitle: str | None = None
    status: str | None = None
    due_date: date | None = None
    link: str | None = None
    badge: AcademyBadgeSummary | None = None


class AcademyDashboardPayload(AcademySchema):
    user: AcademyUserSummary
    stats: AcademyDashboardStats
    my_learning: list[AcademyDashboardItem] = Field(default_factory=list)
    my_workbooks: list[AcademyDashboardItem] = Field(default_factory=list)
    my_qualifications: list[AcademyDashboardItem] = Field(default_factory=list)
    review_queue: list[AcademyDashboardItem] = Field(default_factory=list)


class AcademyTrainingComplianceSummary(AcademySchema):
    active_staff: int = 0
    mandatory_module_assignments: int = 0
    completed_mandatory_module_assignments: int = 0
    overdue_mandatory_module_assignments: int = 0
    compliance_percent: float = 0.0


class AcademyWorkbookComplianceSummary(AcademySchema):
    total_workbook_submissions: int = 0
    completed_workbooks: int = 0
    in_review_workbooks: int = 0
    workbooks_needing_amendment: int = 0
    overdue_workbooks: int = 0


class AcademyQualificationComplianceSummary(AcademySchema):
    total_enrolments: int = 0
    level_3_enrolments: int = 0
    level_5_enrolments: int = 0
    completed_qualifications: int = 0
    active_qualifications: int = 0
    average_completion_percent: float = 0.0


class AcademyHomeCompliancePayload(AcademySchema):
    home_id: int
    home_name: str
    training: AcademyTrainingComplianceSummary
    workbooks: AcademyWorkbookComplianceSummary
    qualifications: AcademyQualificationComplianceSummary


class AcademyProviderCompliancePayload(AcademySchema):
    provider_id: int
    provider_name: str
    total_homes: int = 0
    active_staff: int = 0
    mandatory_module_assignments: int = 0
    completed_mandatory_module_assignments: int = 0
    overdue_mandatory_module_assignments: int = 0
    average_home_compliance_percent: float = 0.0
    total_workbook_submissions: int = 0
    completed_workbooks: int = 0
    overdue_workbooks: int = 0
    total_qualification_enrolments: int = 0
    total_level_3_enrolments: int = 0
    total_level_5_enrolments: int = 0


class AcademyQualityStandardEvidenceRow(AcademySchema):
    quality_standard_id: int
    regulation_number: int
    quality_standard_code: str
    quality_standard_name: str
    linked_modules: int = 0
    linked_qualification_units: int = 0
    accepted_workbook_submissions: int = 0
    evidence_items: int = 0


class AcademySccifDomainEvidenceRow(AcademySchema):
    sccif_domain_code: SccifDomainCode
    sccif_domain_name: str
    linked_modules: int = 0
    completed_module_records: int = 0
    accepted_workbooks: int = 0
    competency_signoffs: int = 0


# =========================================================
# Queue / learner profile summaries
# =========================================================


class AcademyReviewQueueItem(AcademySchema):
    submission_id: int
    workbook_id: int
    workbook_code: str
    workbook_title: str
    workbook_type: WorkbookType
    user_id: int
    learner_name: str
    learner_role: str
    home_id: int | None = None
    home_name: str | None = None
    assessor_user_id: int | None = None
    status: WorkbookSubmissionStatus
    due_date: date | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    attempt_number: int = 1
    queue_status: Literal[
        "review_required",
        "awaiting_learner_resubmission",
        "manager_confirmation_required",
        "no_action",
    ]
    is_overdue: bool = False


class AcademyLearnerProfileSummary(AcademySchema):
    user: AcademyUserSummary
    completed_modules: int = 0
    mandatory_modules_assigned: int = 0
    mandatory_modules_completed: int = 0
    accepted_workbooks: int = 0
    workbooks_needing_amendment: int = 0
    qualifications_enrolled: int = 0
    qualifications_completed: int = 0
    competencies_signed_off: int = 0
    certificates_held: int = 0


# =========================================================
# Generic paginated result models
# =========================================================


class AcademyPaginationMeta(AcademySchema):
    page: int = 1
    page_size: int = 25
    total: int = 0


class AcademyListResponse(AcademySchema):
    items: list[Any] = Field(default_factory=list)
    meta: AcademyPaginationMeta | None = None


AcademyModuleDetail.model_rebuild()
AcademyWorkbookDetail.model_rebuild()
