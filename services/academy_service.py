from __future__ import annotations

from typing import Any

from db import academy_db
from schemas.academy import (
    AcademyDashboardItem,
    AcademyDashboardPayload,
    AcademyDashboardStats,
    AcademyHomeCompliancePayload,
    AcademyLearnerProfileSummary,
    AcademyQualificationComplianceSummary,
    AcademyTrainingComplianceSummary,
    AcademyUserSummary,
    AcademyWorkbookComplianceSummary,
)


class AcademyService:
    # =========================================================
    # Modules
    # =========================================================

    def list_modules(
        self,
        *,
        category_id: int | None = None,
        learning_type: str | None = None,
        difficulty_level: str | None = None,
        module_family: str | None = None,
        active: bool | None = True,
    ) -> list[dict[str, Any]]:
        return academy_db.list_modules(
            category_id=category_id,
            learning_type=learning_type,
            difficulty_level=difficulty_level,
            module_family=module_family,
            active=active,
        )

    def get_module_detail(self, module_id: int, *, user_id: int | None = None) -> dict[str, Any] | None:
        module = academy_db.get_module_by_id(module_id)
        if not module:
            return None

        lessons = academy_db.list_module_lessons(module_id)
        quiz = academy_db.get_module_quiz(module_id)
        quiz_questions: list[dict[str, Any]] = []
        if quiz:
            quiz_questions = academy_db.list_quiz_questions(int(quiz["id"]))

        scenarios = academy_db.list_module_scenarios(module_id)
        reflections = academy_db.list_module_reflections(module_id)
        mappings = academy_db.list_module_mappings(module_id)
        workbooks = academy_db.list_workbooks(module_id=module_id, active=True)

        progress_row: dict[str, Any] | None = None
        if user_id is not None:
            progress_row = academy_db.get_user_module_progress(user_id, module_id)

        payload = {
            **module,
            "lessons": lessons,
            "quiz": quiz,
            "quiz_questions": quiz_questions,
            "scenarios": scenarios,
            "reflections": reflections,
            "mappings": mappings,
            "workbooks": workbooks,
            "progress_status": (progress_row or {}).get("status"),
            "progress_percent": (progress_row or {}).get("progress_percent"),
            "started_at": (progress_row or {}).get("started_at"),
            "completed_at": (progress_row or {}).get("completed_at"),
            "expires_at": (progress_row or {}).get("expires_at"),
        }
        return payload

    def assign_module_to_users(
        self,
        *,
        module_id: int,
        assigned_to_user_ids: list[int],
        assigned_by_user_id: int | None = None,
        home_id: int | None = None,
        mandatory: bool = True,
        due_date=None,
        assigned_reason: str | None = None,
    ) -> list[dict[str, Any]]:
        created: list[dict[str, Any]] = []

        for user_id in assigned_to_user_ids:
            row = academy_db.assign_module_to_user(
                module_id=module_id,
                assigned_to_user_id=user_id,
                assigned_by_user_id=assigned_by_user_id,
                home_id=home_id,
                mandatory=mandatory,
                due_date=due_date,
                assigned_reason=assigned_reason,
            )
            if row:
                created.append(row)

        return created

    # =========================================================
    # Qualifications
    # =========================================================

    def list_qualifications(self, *, active: bool | None = True) -> list[dict[str, Any]]:
        return academy_db.list_qualifications(active=active)

    def get_qualification_detail(
        self,
        qualification_id: int,
        *,
        user_id: int | None = None,
    ) -> dict[str, Any] | None:
        qualification = academy_db.get_qualification_by_id(qualification_id)
        if not qualification:
            return None

        units = academy_db.list_qualification_units(qualification_id)

        enriched_units: list[dict[str, Any]] = []
        for unit in units:
            workbook_rows = academy_db.list_workbooks(
                qualification_unit_id=int(unit["id"]),
                active=True,
            )
            mappings = academy_db.list_qualification_unit_mappings(int(unit["id"]))
            enriched_units.append(
                {
                    **unit,
                    "workbooks": workbook_rows,
                    "mappings": mappings,
                }
            )

        enrolment: dict[str, Any] | None = None
        progress: dict[str, Any] | None = None
        if user_id is not None:
            enrolment = academy_db.get_user_qualification_enrolment(user_id, qualification_id)
            if enrolment:
                progress = academy_db.get_user_qualification_progress(int(enrolment["id"]))

        payload = {
            **qualification,
            "units": enriched_units,
            "enrolment": enrolment,
            "progress": progress,
            "enrolment_status": (enrolment or {}).get("status"),
            "completion_percent": (progress or {}).get("completion_percent", 0),
            "completed_units": (progress or {}).get("completed_units", 0),
            "total_units": (progress or {}).get("total_units", len(units)),
        }
        return payload

    def list_user_qualifications(self, user_id: int) -> list[dict[str, Any]]:
        enrolments = academy_db.list_user_qualification_enrolments(user_id)
        results: list[dict[str, Any]] = []

        for enrolment in enrolments:
            progress = academy_db.get_user_qualification_progress(int(enrolment["id"]))
            results.append(
                {
                    **enrolment,
                    "completed_units": (progress or {}).get("completed_units", 0),
                    "total_units": (progress or {}).get("total_units", 0),
                    "completion_percent": (progress or {}).get("completion_percent", 0),
                }
            )

        return results

    # =========================================================
    # Learner dashboard
    # =========================================================

    def get_user_dashboard(
        self,
        *,
        user_id: int,
        first_name: str,
        last_name: str,
        email: str,
        role: str,
        primary_home_id: int | None = None,
    ) -> AcademyDashboardPayload:
        module_rows = academy_db.list_user_module_status(user_id)
        workbook_rows = academy_db.list_user_workbook_submissions(user_id)
        qualification_rows = academy_db.list_user_qualification_enrolments(user_id)
        certificates = academy_db.list_user_certificates(user_id)

        mandatory_due = 0
        mandatory_overdue = 0

        my_learning: list[AcademyDashboardItem] = []
        my_workbooks: list[AcademyDashboardItem] = []
        my_qualifications: list[AcademyDashboardItem] = []

        for row in module_rows[:8]:
            if row.get("mandatory") and row.get("progress_status") not in ("completed", "passed"):
                mandatory_due += 1
            if row.get("mandatory") and row.get("is_overdue"):
                mandatory_overdue += 1

            my_learning.append(
                AcademyDashboardItem(
                    id=int(row["module_id"]),
                    title=row.get("module_title") or "Module",
                    subtitle=row.get("summary"),
                    status=row.get("progress_status") or "not_started",
                    due_date=row.get("due_date"),
                    link=f"/academy/module-detail.html?id={row['module_id']}",
                )
            )

        for row in workbook_rows[:8]:
            my_workbooks.append(
                AcademyDashboardItem(
                    id=int(row["submission_id"]),
                    title=row.get("workbook_title") or "Workbook",
                    subtitle=row.get("workbook_code"),
                    status=row.get("status") or "draft",
                    due_date=row.get("due_date"),
                    link=f"/academy/workbook-detail.html?submission_id={row['submission_id']}",
                )
            )

        for enrolment in qualification_rows[:8]:
            progress = academy_db.get_user_qualification_progress(int(enrolment["id"]))
            percent = (progress or {}).get("completion_percent", 0)
            my_qualifications.append(
                AcademyDashboardItem(
                    id=int(enrolment["qualification_id"]),
                    title=enrolment.get("qualification_title") or "Qualification",
                    subtitle=f"{percent}% complete",
                    status=enrolment.get("status") or "enrolled",
                    due_date=enrolment.get("target_end_date"),
                    link=f"/academy/qualification-detail.html?enrolment_id={enrolment['id']}",
                )
            )

        workbooks_in_progress = sum(
            1 for row in workbook_rows if row.get("status") in ("draft", "submitted", "under_review")
        )
        workbooks_needing_amendment = sum(
            1 for row in workbook_rows if row.get("status") == "needs_amendment"
        )
        qualifications_active = sum(
            1 for row in qualification_rows if row.get("status") in ("enrolled", "in_progress", "on_hold")
        )

        return AcademyDashboardPayload(
            user=AcademyUserSummary(
                id=user_id,
                first_name=first_name,
                last_name=last_name,
                email=email,
                role=role,
                primary_home_id=primary_home_id,
            ),
            stats=AcademyDashboardStats(
                mandatory_modules_due=mandatory_due,
                mandatory_modules_overdue=mandatory_overdue,
                workbooks_in_progress=workbooks_in_progress,
                workbooks_needing_amendment=workbooks_needing_amendment,
                qualifications_active=qualifications_active,
                certificates_held=len(certificates),
            ),
            my_learning=my_learning,
            my_workbooks=my_workbooks,
            my_qualifications=my_qualifications,
            review_queue=[],
        )

    # =========================================================
    # Review queue
    # =========================================================

    def get_review_queue(
        self,
        *,
        assessor_user_id: int | None = None,
        home_id: int | None = None,
        queue_status: str | None = None,
        overdue_only: bool = False,
    ) -> list[dict[str, Any]]:
        rows = academy_db.list_workbook_review_queue(
            assessor_user_id=assessor_user_id,
            home_id=home_id,
            queue_status=queue_status,
            overdue_only=overdue_only,
        )

        items: list[dict[str, Any]] = []
        for row in rows:
            items.append(
                {
                    "submission_id": row.get("submission_id"),
                    "workbook_id": row.get("workbook_id"),
                    "workbook_code": row.get("workbook_code"),
                    "workbook_title": row.get("workbook_title"),
                    "workbook_type": row.get("workbook_type"),
                    "user_id": row.get("user_id"),
                    "learner_name": " ".join(
                        part for part in [row.get("learner_first_name"), row.get("learner_last_name")] if part
                    ).strip(),
                    "learner_role": row.get("learner_role"),
                    "home_id": row.get("home_id"),
                    "home_name": row.get("home_name"),
                    "assessor_user_id": row.get("assessor_user_id"),
                    "status": row.get("status"),
                    "due_date": row.get("due_date"),
                    "submitted_at": row.get("submitted_at"),
                    "reviewed_at": row.get("reviewed_at"),
                    "attempt_number": row.get("attempt_number", 1),
                    "queue_status": row.get("queue_status"),
                    "is_overdue": bool(row.get("is_overdue")),
                }
            )

        return items

    # =========================================================
    # Compliance
    # =========================================================

    def get_home_compliance(self, home_id: int) -> AcademyHomeCompliancePayload | None:
        training = academy_db.get_home_training_compliance(home_id)
        workbooks = academy_db.get_home_workbook_compliance(home_id)
        qualifications = academy_db.get_home_qualification_summary(home_id)

        home_name = None
        if training:
            home_name = training.get("home_name")
        elif workbooks:
            home_name = workbooks.get("home_name")
        elif qualifications:
            home_name = qualifications.get("home_name")

        if not home_name:
            return None

        return AcademyHomeCompliancePayload(
            home_id=home_id,
            home_name=home_name,
            training=AcademyTrainingComplianceSummary(
                active_staff=(training or {}).get("active_staff", 0),
                mandatory_module_assignments=(training or {}).get("mandatory_module_assignments", 0),
                completed_mandatory_module_assignments=(training or {}).get(
                    "completed_mandatory_module_assignments", 0
                ),
                overdue_mandatory_module_assignments=(training or {}).get(
                    "overdue_mandatory_module_assignments", 0
                ),
                compliance_percent=float((training or {}).get("compliance_percent", 0) or 0),
            ),
            workbooks=AcademyWorkbookComplianceSummary(
                total_workbook_submissions=(workbooks or {}).get("total_workbook_submissions", 0),
                completed_workbooks=(workbooks or {}).get("completed_workbooks", 0),
                in_review_workbooks=(workbooks or {}).get("in_review_workbooks", 0),
                workbooks_needing_amendment=(workbooks or {}).get("workbooks_needing_amendment", 0),
                overdue_workbooks=(workbooks or {}).get("overdue_workbooks", 0),
            ),
            qualifications=AcademyQualificationComplianceSummary(
                total_enrolments=(qualifications or {}).get("total_enrolments", 0),
                level_3_enrolments=(qualifications or {}).get("level_3_enrolments", 0),
                level_5_enrolments=(qualifications or {}).get("level_5_enrolments", 0),
                completed_qualifications=(qualifications or {}).get("completed_qualifications", 0),
                active_qualifications=(qualifications or {}).get("active_qualifications", 0),
                average_completion_percent=float((qualifications or {}).get("average_completion_percent", 0) or 0),
            ),
        )

    def get_provider_compliance(self, provider_id: int) -> dict[str, Any] | None:
        return academy_db.get_provider_compliance_summary(provider_id)

    def get_home_quality_standard_evidence(self, home_id: int) -> list[dict[str, Any]]:
        return academy_db.list_home_quality_standard_evidence(home_id)

    def get_home_sccif_domain_summary(self, home_id: int) -> list[dict[str, Any]]:
        return academy_db.list_home_sccif_domain_summary(home_id)

    # =========================================================
    # Learner profile
    # =========================================================

    def get_learner_profile_summary(self, user_id: int) -> AcademyLearnerProfileSummary | None:
        row = academy_db.get_user_academy_profile_summary(user_id)
        if not row:
            return None

        return AcademyLearnerProfileSummary(
            user=AcademyUserSummary(
                id=int(row["user_id"]),
                first_name=row.get("first_name") or "",
                last_name=row.get("last_name") or "",
                email=row.get("email") or "",
                role=row.get("role") or "",
                primary_home_id=row.get("home_id"),
            ),
            completed_modules=int(row.get("completed_modules", 0) or 0),
            mandatory_modules_assigned=int(row.get("mandatory_modules_assigned", 0) or 0),
            mandatory_modules_completed=int(row.get("mandatory_modules_completed", 0) or 0),
            accepted_workbooks=int(row.get("accepted_workbooks", 0) or 0),
            workbooks_needing_amendment=int(row.get("workbooks_needing_amendment", 0) or 0),
            qualifications_enrolled=int(row.get("qualifications_enrolled", 0) or 0),
            qualifications_completed=int(row.get("qualifications_completed", 0) or 0),
            competencies_signed_off=int(row.get("competencies_signed_off", 0) or 0),
            certificates_held=int(row.get("certificates_held", 0) or 0),
        )

    # =========================================================
    # Utility helpers
    # =========================================================

    def get_user_modules(self, user_id: int) -> list[dict[str, Any]]:
        return academy_db.list_user_module_status(user_id)

    def get_user_workbooks(self, user_id: int, *, status: str | None = None) -> list[dict[str, Any]]:
        return academy_db.list_user_workbook_submissions(user_id, status=status)

    def get_user_certificates(self, user_id: int) -> list[dict[str, Any]]:
        return academy_db.list_user_certificates(user_id)

    def get_user_evidence(self, user_id: int) -> list[dict[str, Any]]:
        return academy_db.list_user_evidence(user_id)
