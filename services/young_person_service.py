from __future__ import annotations

from typing import Any

from services.young_people_service import (
    add_alert,
    add_contact,
    create_young_person,
    get_young_person_by_id,
    get_young_person_overview,
    list_young_people,
    update_young_person,
    upsert_communication_profile,
    upsert_education_profile,
    upsert_health_profile,
    upsert_identity_profile,
    upsert_legal_status,
)


class YoungPersonService:
    @staticmethod
    def list_young_people(
        conn,
        *,
        home_id: int | None = None,
        include_archived: bool = False,
        search: str = "",
    ) -> list[dict[str, Any]]:
        return list_young_people(
            conn,
            home_id=home_id,
            include_archived=include_archived,
            search=search,
        )

    @staticmethod
    def get_young_person_by_id(conn, young_person_id: int) -> dict[str, Any] | None:
        return get_young_person_by_id(conn, young_person_id)

    @staticmethod
    def create_young_person(
        conn,
        *,
        home_id: int,
        first_name: str,
        last_name: str = "",
        preferred_name: str = "",
        date_of_birth: Any = None,
        gender: str = "",
        ethnicity: str = "",
        nhs_number: str = "",
        local_id_number: str = "",
        admission_date: Any = None,
        discharge_date: Any = None,
        placement_status: str = "",
        primary_keyworker_id: int | None = None,
        summary_risk_level: str = "",
        photo_url: str = "",
        archived: bool = False,
    ) -> dict[str, Any]:
        return create_young_person(
            conn,
            home_id=home_id,
            first_name=first_name,
            last_name=last_name,
            preferred_name=preferred_name,
            date_of_birth=date_of_birth,
            gender=gender,
            ethnicity=ethnicity,
            nhs_number=nhs_number,
            local_id_number=local_id_number,
            admission_date=admission_date,
            discharge_date=discharge_date,
            placement_status=placement_status,
            primary_keyworker_id=primary_keyworker_id,
            summary_risk_level=summary_risk_level,
            photo_url=photo_url,
            archived=archived,
        )

    @staticmethod
    def update_young_person(
        conn,
        young_person_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        return update_young_person(conn, young_person_id, payload)

    @staticmethod
    def get_young_person_overview(conn, young_person_id: int) -> dict[str, Any]:
        return get_young_person_overview(conn, young_person_id)

    @staticmethod
    def upsert_communication_profile(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return upsert_communication_profile(
            conn,
            young_person_id=young_person_id,
            payload=payload,
        )

    @staticmethod
    def upsert_education_profile(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return upsert_education_profile(
            conn,
            young_person_id=young_person_id,
            payload=payload,
        )

    @staticmethod
    def upsert_health_profile(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return upsert_health_profile(
            conn,
            young_person_id=young_person_id,
            payload=payload,
        )

    @staticmethod
    def upsert_identity_profile(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return upsert_identity_profile(
            conn,
            young_person_id=young_person_id,
            payload=payload,
        )

    @staticmethod
    def upsert_legal_status(
        conn,
        *,
        young_person_id: int,
        created_by: int | None = None,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return upsert_legal_status(
            conn,
            young_person_id=young_person_id,
            created_by=created_by,
            payload=payload,
        )

    @staticmethod
    def add_contact(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return add_contact(
            conn,
            young_person_id=young_person_id,
            payload=payload,
        )

    @staticmethod
    def add_alert(
        conn,
        *,
        young_person_id: int,
        created_by: int | None,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return add_alert(
            conn,
            young_person_id=young_person_id,
            created_by=created_by,
            payload=payload,
        )
