from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from schemas.academy import (
    AcademyCompetencySignoffRequest,
    AcademyEvidenceCreate,
    AcademyEvidenceLinkRequest,
    AcademyEvidenceReviewRequest,
    AcademyModuleCreate,
    AcademyModuleUpdate,
    AcademyObservationCreate,
    AcademyProfessionalDiscussionCreate,
    AcademyQualificationEnrolRequest,
    AcademyQualificationEnrolmentUpdate,
    AcademyWorkbookAnswersSaveRequest,
    AcademyWorkbookReviewRequest,
    AcademyWorkbookSubmissionCreate,
)
from services.academy_service import AcademyService
from services.academy_workbook_service import AcademyWorkbookService


router = APIRouter(prefix="/academy", tags=["academy"])


class AcademyModuleAssignRequest(BaseModel):
    assigned_to_user_ids: list[int] = Field(default_factory=list)
    mandatory: bool = True
    due_date: date | None = None
    assigned_reason: str | None = None


class AcademyWorkbookResubmitRequest(BaseModel):
    due_date: date | None = None


def _current_user_id(current_user: dict) -> int:
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return int(user_id)


def _current_user_role(current_user: dict) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _current_user_home_id(current_user: dict) -> int | None:
    home_id = current_user.get("home_id") or current_user.get("primary_home_id")
    return int(home_id) if home_id else None


def _ensure_roles(current_user: dict, allowed_roles: set[str]) -> None:
    role = _current_user_role(current_user)
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )


def _is_privileged(current_user: dict) -> bool:
    return _current_user_role(current_user) in {
        "super_admin",
        "provider_admin",
        "responsible_individual",
        "registered_manager",
        "deputy_manager",
        "manager",
        "admin",
        "trainer",
        "assessor",
        "iqa",
        "auditor",
    }


# =========================================================
# Dashboard / profile / compliance
# =========================================================


@router.get("/dashboard/me")
def academy_dashboard_me(current_user: dict = Depends(get_current_user)) -> dict:
    service = AcademyService()

    payload = service.get_user_dashboard(
        user_id=_current_user_id(current_user),
        first_name=str(current_user.get("first_name") or ""),
        last_name=str(current_user.get("last_name") or ""),
        email=str(current_user.get("email") or ""),
        role=_current_user_role(current_user),
        primary_home_id=_current_user_home_id(current_user),
    )
    return {"ok": True, "data": payload.model_dump()}


@router.get("/profile/me")
def academy_profile_me(current_user: dict = Depends(get_current_user)) -> dict:
    service = AcademyService()
    payload = service.get_learner_profile_summary(_current_user_id(current_user))
    return {"ok": True, "data": payload.model_dump() if payload else None}


@router.get("/profile/{user_id}")
def academy_profile_user(user_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
            "auditor",
        },
    )
    service = AcademyService()
    payload = service.get_learner_profile_summary(user_id)
    return {"ok": True, "data": payload.model_dump() if payload else None}


@router.get("/compliance/home/{home_id}")
def academy_home_compliance(home_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "auditor",
        },
    )
    service = AcademyService()
    payload = service.get_home_compliance(home_id)
    return {"ok": True, "data": payload.model_dump() if payload else None}


@router.get("/compliance/provider/{provider_id}")
def academy_provider_compliance(provider_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "admin",
            "auditor",
        },
    )
    service = AcademyService()
    payload = service.get_provider_compliance(provider_id)
    return {"ok": True, "data": payload}


@router.get("/compliance/home/{home_id}/quality-standards")
def academy_home_quality_standards(home_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "auditor",
        },
    )
    service = AcademyService()
    rows = service.get_home_quality_standard_evidence(home_id)
    return {"ok": True, "data": rows}


@router.get("/compliance/home/{home_id}/sccif-domains")
def academy_home_sccif_domains(home_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "auditor",
        },
    )
    service = AcademyService()
    rows = service.get_home_sccif_domain_summary(home_id)
    return {"ok": True, "data": rows}


# =========================================================
# Modules
# =========================================================


@router.get("/modules")
def academy_list_modules(
    category_id: int | None = Query(default=None),
    learning_type: str | None = Query(default=None),
    difficulty_level: str | None = Query(default=None),
    module_family: str | None = Query(default=None),
    active: bool | None = Query(default=True),
    current_user: dict = Depends(get_current_user),
) -> dict:
    _current_user_id(current_user)
    service = AcademyService()
    rows = service.list_modules(
        category_id=category_id,
        learning_type=learning_type,
        difficulty_level=difficulty_level,
        module_family=module_family,
        active=active,
    )
    return {"ok": True, "data": rows}


@router.get("/modules/{module_id}")
def academy_get_module(module_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    service = AcademyService()
    payload = service.get_module_detail(module_id, user_id=_current_user_id(current_user))
    if not payload:
        raise HTTPException(status_code=404, detail="Module not found.")
    return {"ok": True, "data": payload}


@router.post("/modules")
def academy_create_module(
    request: AcademyModuleCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(current_user, {"super_admin", "provider_admin", "admin"})
    from db import academy_db

    row = academy_db.create_module(request.model_dump())
    return {"ok": True, "data": row}


@router.patch("/modules/{module_id}")
def academy_update_module(
    module_id: int,
    request: AcademyModuleUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(current_user, {"super_admin", "provider_admin", "admin"})
    from db import academy_db

    row = academy_db.update_module(
        module_id,
        request.model_dump(exclude_unset=True),
    )
    return {"ok": True, "data": row}


@router.post("/modules/{module_id}/assign")
def academy_assign_module(
    module_id: int,
    request: AcademyModuleAssignRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
        },
    )

    if not request.assigned_to_user_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="assigned_to_user_ids is required.",
        )

    service = AcademyService()
    rows = service.assign_module_to_users(
        module_id=module_id,
        assigned_to_user_ids=request.assigned_to_user_ids,
        assigned_by_user_id=_current_user_id(current_user),
        home_id=_current_user_home_id(current_user),
        mandatory=request.mandatory,
        due_date=request.due_date,
        assigned_reason=request.assigned_reason,
    )
    return {"ok": True, "data": rows}


@router.get("/my/modules")
def academy_my_modules(current_user: dict = Depends(get_current_user)) -> dict:
    service = AcademyService()
    rows = service.get_user_modules(_current_user_id(current_user))
    return {"ok": True, "data": rows}


# =========================================================
# Workbooks
# =========================================================


@router.get("/workbooks")
def academy_list_workbooks(
    module_id: int | None = Query(default=None),
    qualification_unit_id: int | None = Query(default=None),
    workbook_type: str | None = Query(default=None),
    active: bool | None = Query(default=True),
    current_user: dict = Depends(get_current_user),
) -> dict:
    _current_user_id(current_user)
    from db import academy_db

    rows = academy_db.list_workbooks(
        module_id=module_id,
        qualification_unit_id=qualification_unit_id,
        workbook_type=workbook_type,
        active=active,
    )
    return {"ok": True, "data": rows}


@router.get("/workbooks/{workbook_id}")
def academy_get_workbook(
    workbook_id: int,
    submission_id: int | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyWorkbookService()
    payload = service.get_workbook_detail(
        workbook_id=workbook_id,
        user_id=_current_user_id(current_user),
        submission_id=submission_id,
    )
    if not payload:
        raise HTTPException(status_code=404, detail="Workbook not found.")
    return {"ok": True, "data": payload}


@router.post("/workbooks/{workbook_id}/submissions")
def academy_create_workbook_submission(
    workbook_id: int,
    request: AcademyWorkbookSubmissionCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyWorkbookService()
    row = service.create_submission(
        workbook_id=workbook_id,
        user_id=_current_user_id(current_user),
        qualification_enrolment_id=request.qualification_enrolment_id,
        assigned_by_user_id=_current_user_id(current_user),
        due_date=request.due_date,
    )
    return {"ok": True, "data": row}


@router.get("/my/workbook-submissions")
def academy_my_workbook_submissions(
    status_filter: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyService()
    rows = service.get_user_workbooks(
        _current_user_id(current_user),
        status=status_filter,
    )
    return {"ok": True, "data": rows}


@router.get("/workbook-submissions/{submission_id}")
def academy_get_workbook_submission(
    submission_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    from db import academy_db

    submission = academy_db.get_workbook_submission_by_id(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Workbook submission not found.")

    service = AcademyWorkbookService()
    payload = service.get_workbook_detail(
        workbook_id=int(submission["workbook_id"]),
        submission_id=submission_id,
        user_id=_current_user_id(current_user),
    )
    return {"ok": True, "data": payload}


@router.patch("/workbook-submissions/{submission_id}/answers")
def academy_save_workbook_answers(
    submission_id: int,
    request: AcademyWorkbookAnswersSaveRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyWorkbookService()
    payload = service.save_answers(
        submission_id=submission_id,
        answers=[item.model_dump() for item in request.answers],
        actor_user_id=_current_user_id(current_user),
        privileged=_is_privileged(current_user),
    )
    return {"ok": True, "data": payload}


@router.post("/workbook-submissions/{submission_id}/submit")
def academy_submit_workbook(
    submission_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyWorkbookService()
    payload = service.submit(
        submission_id=submission_id,
        actor_user_id=_current_user_id(current_user),
        privileged=_is_privileged(current_user),
    )
    return {"ok": True, "data": payload}


@router.post("/workbook-submissions/{submission_id}/review")
def academy_review_workbook(
    submission_id: int,
    request: AcademyWorkbookReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
        },
    )
    service = AcademyWorkbookService()
    payload = service.review(
        submission_id=submission_id,
        actor_user_id=_current_user_id(current_user),
        decision=request.decision,
        feedback_text=request.feedback_text,
        status=request.status,
    )
    return {"ok": True, "data": payload}


@router.post("/workbook-submissions/{submission_id}/manager-confirm")
def academy_manager_confirm_workbook(
    submission_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
        },
    )
    service = AcademyWorkbookService()
    payload = service.manager_confirm(
        submission_id=submission_id,
        actor_user_id=_current_user_id(current_user),
    )
    return {"ok": True, "data": payload}


@router.post("/workbook-submissions/{submission_id}/resubmit")
def academy_resubmit_workbook(
    submission_id: int,
    request: AcademyWorkbookResubmitRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyWorkbookService()
    payload = service.create_resubmission(
        previous_submission_id=submission_id,
        actor_user_id=_current_user_id(current_user),
        privileged=_is_privileged(current_user),
        due_date=request.due_date,
    )
    return {"ok": True, "data": payload}


@router.get("/review-queue")
def academy_review_queue(
    assessor_user_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    queue_status: str | None = Query(default=None),
    overdue_only: bool = Query(default=False),
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
            "auditor",
        },
    )
    service = AcademyService()
    rows = service.get_review_queue(
        assessor_user_id=assessor_user_id,
        home_id=home_id,
        queue_status=queue_status,
        overdue_only=overdue_only,
    )
    return {"ok": True, "data": rows}


# =========================================================
# Evidence
# =========================================================


@router.get("/evidence/my")
def academy_my_evidence(current_user: dict = Depends(get_current_user)) -> dict:
    service = AcademyService()
    rows = service.get_user_evidence(_current_user_id(current_user))
    return {"ok": True, "data": rows}


@router.post("/evidence")
def academy_create_evidence(
    request: AcademyEvidenceCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    from db import academy_db

    row = academy_db.create_evidence(
        user_id=_current_user_id(current_user),
        created_by_user_id=_current_user_id(current_user),
        evidence_type=request.evidence_type,
        title=request.title,
        description=request.description,
        file_url=request.file_url,
        external_reference=request.external_reference,
        evidence_date=request.evidence_date,
    )
    return {"ok": True, "data": row}


@router.post("/evidence/{evidence_id}/link")
def academy_link_evidence(
    evidence_id: int,
    request: AcademyEvidenceLinkRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyWorkbookService()

    if request.workbook_submission_id:
        row = service.link_evidence_to_submission(
            evidence_item_id=evidence_id,
            workbook_submission_id=request.workbook_submission_id,
            actor_user_id=_current_user_id(current_user),
            privileged=_is_privileged(current_user),
        )
        return {"ok": True, "data": row}

    from db import academy_db

    row = academy_db.link_evidence(
        evidence_item_id=evidence_id,
        workbook_submission_id=request.workbook_submission_id,
        qualification_unit_id=request.qualification_unit_id,
        module_id=request.module_id,
        competency_id=request.competency_id,
    )
    return {"ok": True, "data": row}


@router.post("/evidence/{evidence_id}/review")
def academy_review_evidence(
    evidence_id: int,
    request: AcademyEvidenceReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
            "auditor",
        },
    )
    from db import academy_db

    row = academy_db.review_evidence(
        evidence_item_id=evidence_id,
        reviewed_by_user_id=_current_user_id(current_user),
        decision=request.decision,
        comments=request.comments,
    )
    return {"ok": True, "data": row}


# =========================================================
# Qualifications
# =========================================================


@router.get("/qualifications")
def academy_list_qualifications(current_user: dict = Depends(get_current_user)) -> dict:
    _current_user_id(current_user)
    service = AcademyService()
    rows = service.list_qualifications(active=True)
    return {"ok": True, "data": rows}


@router.get("/qualifications/{qualification_id}")
def academy_get_qualification(
    qualification_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = AcademyService()
    payload = service.get_qualification_detail(
        qualification_id,
        user_id=_current_user_id(current_user),
    )
    if not payload:
        raise HTTPException(status_code=404, detail="Qualification not found.")
    return {"ok": True, "data": payload}


@router.get("/my/qualifications")
def academy_my_qualifications(current_user: dict = Depends(get_current_user)) -> dict:
    service = AcademyService()
    rows = service.list_user_qualifications(_current_user_id(current_user))
    return {"ok": True, "data": rows}


@router.post("/qualifications/{qualification_id}/enrol")
def academy_enrol_qualification(
    qualification_id: int,
    request: AcademyQualificationEnrolRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
        },
    )
    from db import academy_db

    row = academy_db.enrol_user_on_qualification(
        user_id=request.user_id,
        qualification_id=qualification_id,
        enrolled_by_user_id=_current_user_id(current_user),
        assessor_user_id=request.assessor_user_id,
        iqa_user_id=request.iqa_user_id,
        start_date=request.start_date,
        target_end_date=request.target_end_date,
    )
    return {"ok": True, "data": row}


@router.patch("/qualification-enrolments/{enrolment_id}")
def academy_update_enrolment(
    enrolment_id: int,
    request: AcademyQualificationEnrolmentUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
        },
    )
    from db import academy_db

    row = academy_db.update_qualification_enrolment(
        enrolment_id,
        request.model_dump(exclude_unset=True),
    )
    return {"ok": True, "data": row}


# =========================================================
# Assessments / observations / competency
# =========================================================


@router.post("/observations")
def academy_create_observation(
    request: AcademyObservationCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
        },
    )
    from db import academy_db

    row = academy_db.create_observation_record(
        user_id=request.user_id,
        observer_user_id=_current_user_id(current_user),
        workbook_submission_id=request.workbook_submission_id,
        observation_title=request.observation_title,
        observation_text=request.observation_text,
        observed_at=request.observed_at,
        outcome=request.outcome,
    )
    return {"ok": True, "data": row}


@router.post("/professional-discussions")
def academy_create_professional_discussion(
    request: AcademyProfessionalDiscussionCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
        },
    )
    from db import academy_db

    row = academy_db.create_professional_discussion(
        user_id=request.user_id,
        assessor_user_id=_current_user_id(current_user),
        workbook_submission_id=request.workbook_submission_id,
        discussion_title=request.discussion_title,
        discussion_summary=request.discussion_summary,
        discussion_date=request.discussion_date,
        outcome=request.outcome,
    )
    return {"ok": True, "data": row}


@router.post("/competencies/{competency_id}/signoff")
def academy_signoff_competency(
    competency_id: int,
    request: AcademyCompetencySignoffRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    _ensure_roles(
        current_user,
        {
            "super_admin",
            "provider_admin",
            "responsible_individual",
            "registered_manager",
            "deputy_manager",
            "manager",
            "admin",
            "trainer",
            "assessor",
            "iqa",
        },
    )
    from db import academy_db

    row = academy_db.sign_off_competency(
        competency_id=competency_id,
        user_id=request.user_id,
        signed_off_by_user_id=_current_user_id(current_user),
        outcome=request.outcome,
        notes=request.notes,
        expires_at=request.expires_at,
    )
    return {"ok": True, "data": row}


# =========================================================
# Certificates
# =========================================================


@router.get("/my/certificates")
def academy_my_certificates(current_user: dict = Depends(get_current_user)) -> dict:
    service = AcademyService()
    rows = service.get_user_certificates(_current_user_id(current_user))
    return {"ok": True, "data": rows}
