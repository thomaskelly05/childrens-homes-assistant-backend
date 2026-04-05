from __future__ import annotations

from services.standards_link_service import StandardLinkInput


class StandardsMapper:
    def map_record(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        method_name = f"_map_{source_table}"
        mapper = getattr(self, method_name, None)
        if mapper is None:
            return []
        return mapper(
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
            record=record,
            linked_by=linked_by,
        )

    def _map_daily_notes(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        links: list[StandardLinkInput] = [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS01",
                evidence_strength="moderate",
                rationale="Daily note evidences the quality and purpose of day-to-day care.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            )
        ]

        if record.get("young_person_voice"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS02",
                    evidence_strength="strong",
                    rationale="Direct child voice recorded in the daily note.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        if record.get("health_update"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS07",
                    evidence_strength="light",
                    rationale="Daily note includes health-related recording.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        if record.get("education_update"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS08",
                    evidence_strength="light",
                    rationale="Daily note includes education-related recording.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        return links

    def _map_incidents(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        links = [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS12",
                evidence_strength="strong",
                rationale="Incident record evidences safeguarding and protective response.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="helped_and_protected",
            )
        ]

        if record.get("child_voice"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS02",
                    evidence_strength="moderate",
                    rationale="Incident includes the child's voice or response.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        if record.get("manager_review_required"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS13",
                    evidence_strength="moderate",
                    rationale="Incident requires leadership and management oversight.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="leadership_and_management",
                )
            )

        return links

    def _map_risk_assessments(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        links = [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS12",
                evidence_strength="strong",
                rationale="Risk assessment evidences understanding and management of harm and vulnerability.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="helped_and_protected",
            ),
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS13",
                evidence_strength="moderate",
                rationale="Risk assessment supports management oversight and review.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="leadership_and_management",
            ),
        ]

        if record.get("child_views"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS02",
                    evidence_strength="moderate",
                    rationale="Risk assessment includes the child's views.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        return links

    def _map_support_plans(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        links = [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS01",
                evidence_strength="strong",
                rationale="Support plan evidences planned, individualised care.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            ),
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS14",
                evidence_strength="strong",
                rationale="Support plan evidences care planning and review.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            ),
        ]

        if record.get("child_voice"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS02",
                    evidence_strength="moderate",
                    rationale="Support plan includes the child's wishes, views or voice.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        return links

    def _map_young_person_appointments(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        links: list[StandardLinkInput] = []
        appointment_type = str(record.get("appointment_type") or "").lower()

        if appointment_type in {"health", "therapy"}:
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS07",
                    evidence_strength="moderate",
                    rationale="Appointment supports health and wellbeing planning.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        if appointment_type in {"education", "school"}:
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS08",
                    evidence_strength="moderate",
                    rationale="Appointment supports education progress and planning.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        if record.get("child_voice"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS02",
                    evidence_strength="moderate",
                    rationale="Appointment record includes the child's voice or preparation needs.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        return links

    def _map_keywork_sessions(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        links = [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS01",
                evidence_strength="moderate",
                rationale="Keywork evidences direct planned work with the young person.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            )
        ]

        if record.get("child_voice"):
            links.append(
                StandardLinkInput(
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    standard_code="QS02",
                    evidence_strength="strong",
                    rationale="Keywork includes the child's views or voice.",
                    linked_by=linked_by,
                    auto_linked=True,
                    judgement_area="experiences_and_progress",
                )
            )

        return links

    def _map_health_records(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        return [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS07",
                evidence_strength="moderate",
                rationale="Health record evidences health and wellbeing support.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            )
        ]

    def _map_education_records(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        return [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS08",
                evidence_strength="moderate",
                rationale="Education record evidences education engagement and support.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            )
        ]

    def _map_family_contact_records(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        return [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS11",
                evidence_strength="moderate",
                rationale="Family contact record evidences support for positive relationships.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            )
        ]

    def _map_safeguarding_records(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        return [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS12",
                evidence_strength="strong",
                rationale="Safeguarding record evidences response to child protection concerns.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="helped_and_protected",
            )
        ]

    def _map_missing_episodes(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        return [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS12",
                evidence_strength="strong",
                rationale="Missing episode record evidences protective response and review of vulnerability.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="helped_and_protected",
            )
        ]

    def _map_achievement_records(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        record: dict,
        linked_by: int | None,
    ) -> list[StandardLinkInput]:
        return [
            StandardLinkInput(
                young_person_id=young_person_id,
                source_table=source_table,
                source_id=source_id,
                standard_code="QS06",
                evidence_strength="moderate",
                rationale="Achievement record evidences progress and positive experiences.",
                linked_by=linked_by,
                auto_linked=True,
                judgement_area="experiences_and_progress",
            )
        ]
