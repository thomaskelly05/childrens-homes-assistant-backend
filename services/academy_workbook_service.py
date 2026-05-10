from __future__ import annotations

from typing import Any

from db import academy_db


class AcademyWorkbookService:
    def get_workbook_detail(
        self,
        *,
        workbook_id: int,
        user_id: int | None = None,
        submission_id: int | None = None,
    ) -> dict[str, Any] | None:
        workbook = academy_db.get_workbook_by_id(workbook_id)
        if not workbook:
            return None

        sections = academy_db.list_workbook_sections(workbook_id)
        questions = academy_db.list_workbook_questions(workbook_id)

        submission: dict[str, Any] | None = None
        answers_by_question_id: dict[int, dict[str, Any]] = {}
        feedback: list[dict[str, Any]] = []

        if submission_id is not None:
            submission = academy_db.get_workbook_submission_by_id(submission_id)
        elif user_id is not None:
            submission = academy_db.get_latest_workbook_submission(workbook_id, user_id)

        if submission:
            answers = academy_db.list_workbook_answers(int(submission["id"]))
            answers_by_question_id = {
                int(row["question_id"]): row for row in answers
            }
            feedback = academy_db.list_workbook_feedback(int(submission["id"]))

        section_map: dict[int, dict[str, Any]] = {}
        for section in sections:
            section_map[int(section["id"])] = {
                **section,
                "questions": [],
            }

        for question in questions:
            question_id = int(question["id"])
            answer_row = answers_by_question_id.get(question_id)
            enriched_question = {
                **question,
                "answer_text": (answer_row or {}).get("answer_text"),
                "answer_json": (answer_row or {}).get("answer_json"),
            }
            section_id = int(question["section_id"])
            if section_id in section_map:
                section_map[section_id]["questions"].append(enriched_question)

        ordered_sections = [
            section_map[int(section["id"])]
            for section in sections
            if int(section["id"]) in section_map
        ]

        return {
            "workbook": workbook,
            "submission": submission,
            "sections": ordered_sections,
            "feedback": feedback,
        }

    def create_submission(
        self,
        *,
        workbook_id: int,
        user_id: int,
        qualification_enrolment_id: int | None = None,
        assigned_by_user_id: int | None = None,
        assessor_user_id: int | None = None,
        due_date=None,
    ) -> dict[str, Any] | None:
        workbook = academy_db.get_workbook_by_id(workbook_id)
        if not workbook:
            raise ValueError("Workbook not found.")

        existing = academy_db.get_latest_workbook_submission(workbook_id, user_id)
        if existing and existing.get("status") in {"draft", "submitted", "under_review"}:
            return existing

        return academy_db.create_workbook_submission(
            workbook_id=workbook_id,
            user_id=user_id,
            qualification_enrolment_id=qualification_enrolment_id,
            assigned_by_user_id=assigned_by_user_id,
            assessor_user_id=assessor_user_id,
            due_date=due_date,
        )

    def get_submission_for_actor(
        self,
        *,
        submission_id: int,
        actor_user_id: int,
        privileged: bool = False,
    ) -> dict[str, Any]:
        submission = academy_db.get_workbook_submission_by_id(submission_id)
        if not submission:
            raise ValueError("Workbook submission not found.")

        if not privileged and int(submission["user_id"]) != int(actor_user_id):
            raise PermissionError("You do not have access to this workbook submission.")

        return submission

    def save_answers(
        self,
        *,
        submission_id: int,
        answers: list[dict[str, Any]],
        actor_user_id: int,
        privileged: bool = False,
    ) -> dict[str, Any]:
        submission = self.get_submission_for_actor(
            submission_id=submission_id,
            actor_user_id=actor_user_id,
            privileged=privileged,
        )

        if submission.get("status") not in {"draft", "needs_amendment"}:
            raise ValueError("Answers can only be saved while the submission is draft or needs amendment.")

        workbook_id = int(submission["workbook_id"])
        questions = academy_db.list_workbook_questions(workbook_id)
        valid_question_ids = {int(q["id"]) for q in questions}

        saved_count = 0
        for answer in answers:
            question_id = int(answer["question_id"])
            if question_id not in valid_question_ids:
                raise ValueError(f"Question {question_id} does not belong to this workbook.")

            academy_db.upsert_workbook_answer(
                submission_id=submission_id,
                question_id=question_id,
                answer_text=answer.get("answer_text"),
                answer_json=answer.get("answer_json"),
            )
            saved_count += 1

        return {
            "submission_id": submission_id,
            "saved_answers": saved_count,
            "status": submission.get("status"),
        }

    def validate_submission(self, submission_id: int) -> dict[str, Any]:
        submission = academy_db.get_workbook_submission_by_id(submission_id)
        if not submission:
            raise ValueError("Workbook submission not found.")

        workbook_id = int(submission["workbook_id"])
        questions = academy_db.list_workbook_questions(workbook_id)
        answers = academy_db.list_workbook_answers(submission_id)

        answers_by_question_id: dict[int, dict[str, Any]] = {
            int(row["question_id"]): row for row in answers
        }

        missing_required_question_ids: list[int] = []
        missing_required_evidence_question_ids: list[int] = []

        for question in questions:
            question_id = int(question["id"])
            required = bool(question.get("required"))
            response_type = question.get("response_type")
            answer_row = answers_by_question_id.get(question_id)

            if not required:
                continue

            if not answer_row:
                missing_required_question_ids.append(question_id)
                continue

            if response_type == "evidence_link":
                answer_json = answer_row.get("answer_json") or {}
                linked_ids = answer_json.get("linked_evidence_ids") if isinstance(answer_json, dict) else None
                if not linked_ids:
                    missing_required_evidence_question_ids.append(question_id)
                continue

            answer_text = answer_row.get("answer_text")
            answer_json = answer_row.get("answer_json")

            has_text = isinstance(answer_text, str) and answer_text.strip() != ""
            has_json = answer_json not in (None, {}, [])
            if not has_text and not has_json:
                missing_required_question_ids.append(question_id)

        is_valid = not missing_required_question_ids and not missing_required_evidence_question_ids

        return {
            "submission_id": submission_id,
            "is_valid": is_valid,
            "missing_required_question_ids": missing_required_question_ids,
            "missing_required_evidence_question_ids": missing_required_evidence_question_ids,
        }

    def submit(
        self,
        *,
        submission_id: int,
        actor_user_id: int,
        privileged: bool = False,
    ) -> dict[str, Any]:
        submission = self.get_submission_for_actor(
            submission_id=submission_id,
            actor_user_id=actor_user_id,
            privileged=privileged,
        )

        if submission.get("status") not in {"draft", "needs_amendment"}:
            raise ValueError("Only draft or amended submissions can be submitted.")

        validation = self.validate_submission(submission_id)
        if not validation["is_valid"]:
            raise ValueError(
                "Workbook submission cannot be submitted while required answers or evidence are missing."
            )

        updated = academy_db.mark_workbook_submission_submitted(submission_id)
        if not updated:
            raise ValueError("Failed to submit workbook.")

        return {
            "submission_id": submission_id,
            "status": updated.get("status"),
            "submitted_at": updated.get("submitted_at"),
        }

    def review(
        self,
        *,
        submission_id: int,
        actor_user_id: int,
        decision: str,
        feedback_text: str,
        status: str,
    ) -> dict[str, Any]:
        submission = academy_db.get_workbook_submission_by_id(submission_id)
        if not submission:
            raise ValueError("Workbook submission not found.")

        if submission.get("status") not in {"submitted", "under_review"}:
            raise ValueError("Only submitted or under-review workbooks can be reviewed.")

        updated = academy_db.update_workbook_submission_review(
            submission_id=submission_id,
            status=status,
            assessor_decision=self._map_assessment_decision(decision),
            assessor_summary=feedback_text,
            assessor_user_id=actor_user_id,
        )
        if not updated:
            raise ValueError("Failed to update workbook review.")

        academy_db.add_workbook_feedback(
            submission_id=submission_id,
            feedback_by_user_id=actor_user_id,
            feedback_type="assessor",
            feedback_text=feedback_text,
        )

        if status == "completed":
            academy_db.complete_workbook_submission(submission_id)

        return {
            "submission_id": submission_id,
            "decision": decision,
            "status": status,
            "reviewed_at": updated.get("reviewed_at"),
        }

    def manager_confirm(
        self,
        *,
        submission_id: int,
        actor_user_id: int,
    ) -> dict[str, Any]:
        submission = academy_db.get_workbook_submission_by_id(submission_id)
        if not submission:
            raise ValueError("Workbook submission not found.")

        workbook = academy_db.get_workbook_by_id(int(submission["workbook_id"]))
        if not workbook:
            raise ValueError("Workbook not found.")

        if not workbook.get("requires_manager_confirmation"):
            raise ValueError("This workbook does not require manager confirmation.")

        if submission.get("status") not in {"accepted", "completed"}:
            raise ValueError("Only accepted or completed workbooks can be manager confirmed.")

        academy_db.add_workbook_feedback(
            submission_id=submission_id,
            feedback_by_user_id=actor_user_id,
            feedback_type="manager",
            feedback_text="Manager confirmation recorded.",
        )

        return {
            "submission_id": submission_id,
            "status": submission.get("status"),
            "manager_confirmed_by_user_id": actor_user_id,
        }

    def create_resubmission(
        self,
        *,
        previous_submission_id: int,
        actor_user_id: int,
        privileged: bool = False,
        due_date=None,
    ) -> dict[str, Any]:
        previous = self.get_submission_for_actor(
            submission_id=previous_submission_id,
            actor_user_id=actor_user_id,
            privileged=privileged,
        )

        if previous.get("status") != "needs_amendment":
            raise ValueError("A resubmission can only be created from a needs_amendment submission.")

        new_submission = academy_db.create_workbook_resubmission(
            previous_submission_id=previous_submission_id,
            workbook_id=int(previous["workbook_id"]),
            user_id=int(previous["user_id"]),
            qualification_enrolment_id=previous.get("qualification_enrolment_id"),
            assigned_by_user_id=previous.get("assigned_by_user_id"),
            assessor_user_id=previous.get("assessor_user_id"),
            due_date=due_date or previous.get("due_date"),
        )
        if not new_submission:
            raise ValueError("Failed to create workbook resubmission.")

        return {
            "previous_submission_id": previous_submission_id,
            "new_submission_id": new_submission.get("id"),
            "status": new_submission.get("status"),
            "attempt_number": new_submission.get("attempt_number"),
        }

    def link_evidence_to_submission(
        self,
        *,
        evidence_item_id: int,
        workbook_submission_id: int,
        actor_user_id: int,
        privileged: bool = False,
    ) -> dict[str, Any]:
        submission = self.get_submission_for_actor(
            submission_id=workbook_submission_id,
            actor_user_id=actor_user_id,
            privileged=privileged,
        )
        evidence = academy_db.get_evidence_by_id(evidence_item_id)
        if not evidence:
            raise ValueError("Evidence item not found.")

        if not privileged and int(evidence["user_id"]) != int(actor_user_id):
            raise PermissionError("You do not have access to this evidence item.")

        return academy_db.link_evidence(
            evidence_item_id=evidence_item_id,
            workbook_submission_id=int(submission["id"]),
        ) or {}

    def _map_assessment_decision(self, decision: str) -> str:
        mapping = {
            "pass": "pass",
            "refer": "refer",
            "resubmit": "resubmit",
            "insufficient_evidence": "refer",
        }
        return mapping.get(decision, "pending")
