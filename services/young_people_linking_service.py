from __future__ import annotations

from datetime import date, datetime
from typing import Any

from psycopg2.extras import Json

from services.plan_flow_service import plan_flow_service


DOMAIN_TERMS: dict[str, tuple[str, ...]] = {
    "health": ("health", "medication", "medicine", "tablet", "dose", "pain", "injury", "sleep", "camhs", "therapy", "doctor", "gp", "hospital", "appointment", "self-harm", "wellbeing"),
    "education": ("school", "education", "lesson", "college", "attendance", "teacher", "homework", "pep", "timetable", "exclusion"),
    "risk": ("risk", "unsafe", "trigger", "escalated", "heightened", "abscond", "missing", "violence", "aggression", "restraint", "harm", "knife", "drugs", "alcohol", "exploitation"),
    "safeguarding": ("safeguarding", "disclosure", "allegation", "abuse", "neglect", "exploitation", "unknown adult", "police", "strategy", "mash", "referral", "missing"),
    "family": ("family", "contact", "mum", "mother", "dad", "father", "sibling", "aunt", "uncle", "grandparent", "phone call", "visit"),
    "behaviour": ("behaviour", "sanction", "consequence", "physical intervention", "restraint", "de-escalation", "repair", "conflict"),
    "child_voice": ("said", "told", "voice", "wishes", "feelings", "wanted", "did not want", "i feel", "i want"),
    "placement": ("placement", "care plan", "placement plan", "independence", "transition", "move", "discharge", "admission"),
}

DOMAIN_PLAN_TABLES: dict[str, tuple[str, ...]] = {
    "health": ("health_plans", "health_records", "medication_records", "support_plans"),
    "education": ("education_plans", "education_records", "pep_records", "support_plans"),
    "risk": ("risk_assessments", "risk_reviews", "missing_risk_assessments", "support_plans"),
    "safeguarding": ("safeguarding_records", "missing_risk_assessments", "risk_assessments", "support_plans"),
    "family": ("family_contact_plans", "family_contact_records", "support_plans"),
    "behaviour": ("behaviour_support_plans", "risk_assessments", "support_plans"),
    "child_voice": ("child_voice_records", "keywork_sessions", "support_plans"),
    "placement": ("placement_plans", "care_plans", "support_plans"),
}

DOMAIN_STANDARDS: dict[str, tuple[str, ...]] = {
    "health": ("reg_10_health_and_wellbeing",),
    "education": ("reg_8_education",),
    "risk": ("reg_12_protection", "reg_13_leadership"),
    "safeguarding": ("reg_12_protection", "reg_40_notifications"),
    "family": ("reg_11_positive_relationships",),
    "behaviour": ("reg_11_positive_relationships", "reg_35_behaviour_management"),
    "child_voice": ("reg_7_views_wishes_feelings",),
    "placement": ("reg_6_quality_and_purpose", "reg_14_care_planning"),
}


class YoungPeopleLinkingService:
    """
    Central linking / workflow engine for all young people's records.
    """

    @staticmethod
    def process_record_event(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        event_type: str = "created",
        title: str | None = None,
        summary: str | None = None,
        narrative: str | None = None,
        category: str | None = None,
        subcategory: str | None = None,
        significance: str | None = None,
        review_date: str | date | None = None,
        due_date: str | date | None = None,
        owner_id: int | None = None,
        created_by: int | None = None,
        workflow: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        workflow = workflow or {}
        metadata = metadata or {}

        safe_title = title or YoungPeopleLinkingService._default_title(source_table, event_type)
        safe_summary = summary or title or YoungPeopleLinkingService._default_summary(source_table, event_type)
        safe_narrative = narrative or safe_summary
        inferred_domains = YoungPeopleLinkingService._infer_domains(
            source_table=source_table,
            title=safe_title,
            summary=safe_summary,
            narrative=safe_narrative,
            metadata=metadata,
        )
        metadata = YoungPeopleLinkingService._merge_inferred_metadata(metadata, inferred_domains)

        result = {
            "source_table": source_table,
            "source_id": source_id,
            "young_person_id": young_person_id,
            "event_type": event_type,
            "inferred_domains": inferred_domains,
            "chronology_event_id": None,
            "task_id": None,
            "manager_action_id": None,
            "safeguarding_record_id": None,
            "record_links_created": 0,
            "support_plan_links_created": 0,
            "domain_plan_links_created": 0,
            "monthly_review_links_created": 0,
            "standard_links_created": 0,
            "post_save_intelligence": None,
            "notes": [],
            "errors": [],
        }

        link_chronology = bool(workflow.get("link_chronology", True))
        create_task = bool(workflow.get("create_task", False) or workflow.get("create_follow_up_task", False) or metadata.get("actions_required"))
        manager_review = bool(workflow.get("manager_review", False) or workflow.get("manager_review_needed", False) or inferred_domains.intersection({"risk", "safeguarding", "health"}))
        safeguarding = bool(workflow.get("safeguarding", False) or workflow.get("safeguarding_concern", False) or "safeguarding" in inferred_domains)
        link_support_plans = bool(workflow.get("link_support_plans", False) or inferred_domains)
        link_monthly_reviews = bool(workflow.get("link_monthly_reviews", False) or workflow.get("link_monthly_reviews", False) or inferred_domains)
        link_quality_standards = bool(workflow.get("link_quality_standards", True))

        try:
            if link_chronology:
                chronology_id = YoungPeopleLinkingService._create_or_update_chronology_event(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    title=safe_title,
                    summary=safe_summary,
                    category=category or YoungPeopleLinkingService._category_from_domains(source_table, inferred_domains),
                    subcategory=subcategory or category or YoungPeopleLinkingService._subcategory_from_domains(source_table, inferred_domains),
                    significance=significance or YoungPeopleLinkingService._significance_from_domains(source_table, metadata, inferred_domains),
                    created_by=created_by,
                    metadata=metadata,
                    event_type=event_type,
                )
                result["chronology_event_id"] = chronology_id
                result["notes"].append("Chronology event processed.")

                if chronology_id:
                    if YoungPeopleLinkingService._create_record_link_if_missing(
                        conn=conn,
                        young_person_id=young_person_id,
                        from_table=source_table,
                        from_id=source_id,
                        to_table="chronology_events",
                        to_id=chronology_id,
                        relationship_type="timeline_entry",
                        created_by=created_by,
                    ):
                        result["record_links_created"] += 1
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Chronology linking failed: {exc}")

        try:
            if create_task:
                task_id = YoungPeopleLinkingService._create_task_if_missing(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    title=f"Follow up: {safe_title}",
                    task=safe_summary,
                    owner_id=owner_id,
                    due_date=due_date or review_date,
                    task_type=YoungPeopleLinkingService._default_task_type(source_table),
                )
                result["task_id"] = task_id
                result["notes"].append("Task processed.")

                if task_id:
                    if YoungPeopleLinkingService._create_record_link_if_missing(
                        conn=conn,
                        young_person_id=young_person_id,
                        from_table=source_table,
                        from_id=source_id,
                        to_table="tasks",
                        to_id=task_id,
                        relationship_type="follow_up_task",
                        created_by=created_by,
                    ):
                        result["record_links_created"] += 1
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Task creation failed: {exc}")

        try:
            if manager_review:
                manager_action_id = YoungPeopleLinkingService._create_manager_action_if_missing(
                    conn=conn,
                    young_person_id=young_person_id,
                    related_table=source_table,
                    related_id=source_id,
                    action_type=YoungPeopleLinkingService._default_manager_action_type(source_table),
                    note=f"Manager review required: {safe_title}",
                    action_by=created_by,
                )
                result["manager_action_id"] = manager_action_id
                result["notes"].append("Manager action processed.")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Manager action creation failed: {exc}")

        try:
            if safeguarding:
                safeguarding_id = YoungPeopleLinkingService._create_safeguarding_record(
                    conn=conn,
                    young_person_id=young_person_id,
                    incident_id=source_id if source_table == "incidents" else None,
                    safeguarding_category=category or YoungPeopleLinkingService._default_safeguarding_category(source_table),
                    concern_details=safe_narrative,
                    immediate_action_taken=metadata.get("response_actions"),
                    created_by=created_by,
                )
                result["safeguarding_record_id"] = safeguarding_id
                result["notes"].append("Safeguarding record created.")

                if safeguarding_id:
                    if YoungPeopleLinkingService._create_record_link_if_missing(
                        conn=conn,
                        young_person_id=young_person_id,
                        from_table=source_table,
                        from_id=source_id,
                        to_table="safeguarding_records",
                        to_id=safeguarding_id,
                        relationship_type="safeguarding_link",
                        created_by=created_by,
                    ):
                        result["record_links_created"] += 1
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Safeguarding creation failed: {exc}")

        try:
            if link_support_plans:
                count = YoungPeopleLinkingService._link_to_active_support_plans(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    created_by=created_by,
                )
                result["support_plan_links_created"] = count
                if count:
                    result["record_links_created"] += count
                    result["notes"].append(f"Linked to {count} support plan(s).")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Support plan linking failed: {exc}")

        try:
            if inferred_domains:
                count = YoungPeopleLinkingService._link_to_domain_plans(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    domains=inferred_domains,
                    created_by=created_by,
                )
                result["domain_plan_links_created"] = count
                if count:
                    result["record_links_created"] += count
                    result["notes"].append(f"Linked to {count} domain plan(s).")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Domain plan linking failed: {exc}")

        try:
            if link_monthly_reviews:
                count = YoungPeopleLinkingService._link_to_relevant_monthly_reviews(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    created_by=created_by,
                    reason=f"Linked from {source_table} {event_type}",
                )
                result["monthly_review_links_created"] = count
                if count:
                    result["notes"].append(f"Linked to {count} monthly review record(s).")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Monthly review linking failed: {exc}")

        try:
            if link_quality_standards:
                count = YoungPeopleLinkingService._link_quality_standards(
                    conn=conn,
                    young_person_id=young_person_id,
                    source_table=source_table,
                    source_id=source_id,
                    metadata=metadata,
                    linked_by=created_by,
                )
                result["standard_links_created"] = count
                if count:
                    result["notes"].append(f"Linked to {count} quality standard(s).")
        except Exception as exc:
            conn.rollback()
            result["errors"].append(f"Quality standards linking failed: {exc}")

        result["post_save_intelligence"] = YoungPeopleLinkingService._post_save_intelligence(
            conn=conn,
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
            title=safe_title,
            summary=safe_summary,
            narrative=safe_narrative,
            metadata=metadata,
        )

        return result

    @staticmethod
    def _infer_domains(*, source_table: str, title: str, summary: str, narrative: str, metadata: dict[str, Any]) -> set[str]:
        text = " ".join(
            str(value or "")
            for value in [
                source_table,
                title,
                summary,
                narrative,
                metadata.get("mood"),
                metadata.get("presentation"),
                metadata.get("activities"),
                metadata.get("education_update"),
                metadata.get("health_update"),
                metadata.get("family_update"),
                metadata.get("behaviour_update"),
                metadata.get("young_person_voice"),
                metadata.get("actions_required"),
                metadata.get("significance"),
            ]
        ).lower()
        domains = {domain for domain, terms in DOMAIN_TERMS.items() if any(term in text for term in terms)}
        source_defaults = {
            "health_records": "health",
            "education_records": "education",
            "family_contact_records": "family",
            "risk_assessments": "risk",
            "risk_reviews": "risk",
            "incidents": "risk",
            "safeguarding_records": "safeguarding",
            "keywork_sessions": "child_voice",
            "support_plans": "placement",
            "placement_plans": "placement",
        }
        if source_defaults.get(source_table):
            domains.add(source_defaults[source_table])
        if metadata.get("safeguarding_concern") or metadata.get("manager_review_needed") and domains.intersection({"risk", "health"}):
            domains.add("safeguarding") if metadata.get("safeguarding_concern") else None
        return domains

    @staticmethod
    def _merge_inferred_metadata(metadata: dict[str, Any], domains: set[str]) -> dict[str, Any]:
        existing = metadata.get("quality_standards") or metadata.get("standard_codes") or []
        if not isinstance(existing, list):
            existing = [existing]
        standards: list[str] = [str(item) for item in existing if item]
        for domain in domains:
            standards.extend(DOMAIN_STANDARDS.get(domain, ()))
        merged = {**metadata}
        merged["inferred_domains"] = sorted(domains)
        merged["quality_standards"] = list(dict.fromkeys(standards))
        merged["evidence_strength"] = metadata.get("evidence_strength") or ("high" if domains.intersection({"risk", "safeguarding"}) else "medium")
        merged["standards_rationale"] = metadata.get("standards_rationale") or "Automatically linked from record content and source type; manager review remains required where this affects care planning."
        return merged

    @staticmethod
    def _category_from_domains(source_table: str, domains: set[str]) -> str:
        priority = ["safeguarding", "risk", "health", "education", "family", "behaviour", "child_voice", "placement"]
        for domain in priority:
            if domain in domains:
                return domain
        return YoungPeopleLinkingService._default_category(source_table)

    @staticmethod
    def _subcategory_from_domains(source_table: str, domains: set[str]) -> str:
        return YoungPeopleLinkingService._category_from_domains(source_table, domains)

    @staticmethod
    def _significance_from_domains(source_table: str, metadata: dict[str, Any], domains: set[str]) -> str:
        if domains.intersection({"safeguarding", "risk"}):
            return "high"
        if domains.intersection({"health", "education", "family", "behaviour"}):
            return "medium"
        return YoungPeopleLinkingService._default_significance(source_table, metadata)

    @staticmethod
    def _table_exists(conn, table_name: str) -> bool:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                )
                """,
                (table_name,),
            )
            row = cur.fetchone()
            return bool((row.get("exists") if isinstance(row, dict) else row[0]) if row else False)

    @staticmethod
    def _table_columns(conn, table_name: str) -> set[str]:
        if not YoungPeopleLinkingService._table_exists(conn, table_name):
            return set()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                """,
                (table_name,),
            )
            return {str(row.get("column_name") if isinstance(row, dict) else row[0]) for row in cur.fetchall() or []}

    @staticmethod
    def _id_from_row(row: Any) -> int | None:
        if not row:
            return None
        value = row.get("id") if isinstance(row, dict) else row[0]
        try:
            return int(value)
        except Exception:
            return None

    @staticmethod
    def _link_to_domain_plans(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        domains: set[str],
        created_by: int | None,
    ) -> int:
        count = 0
        seen_targets: set[tuple[str, int]] = set()
        for domain in domains:
            for target_table in DOMAIN_PLAN_TABLES.get(domain, ()): 
                if not YoungPeopleLinkingService._table_exists(conn, target_table):
                    continue
                cols = YoungPeopleLinkingService._table_columns(conn, target_table)
                if "id" not in cols or "young_person_id" not in cols:
                    continue
                status_clause = ""
                if "archived" in cols:
                    status_clause += " AND COALESCE(archived, FALSE) = FALSE"
                if "status" in cols:
                    status_clause += " AND LOWER(COALESCE(status::text, 'active')) NOT IN ('archived', 'closed', 'completed')"
                order_col = "updated_at" if "updated_at" in cols else "created_at" if "created_at" in cols else "id"
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT id FROM {target_table}
                        WHERE young_person_id = %s
                        {status_clause}
                        ORDER BY {order_col} DESC NULLS LAST
                        LIMIT 3
                        """,
                        (young_person_id,),
                    )
                    rows = cur.fetchall() or []
                for row in rows:
                    target_id = YoungPeopleLinkingService._id_from_row(row)
                    if target_id is None or (target_table, target_id) in seen_targets:
                        continue
                    seen_targets.add((target_table, target_id))
                    created = YoungPeopleLinkingService._create_record_link_if_missing(
                        conn=conn,
                        young_person_id=young_person_id,
                        from_table=source_table,
                        from_id=source_id,
                        to_table=target_table,
                        to_id=target_id,
                        relationship_type=f"{domain}_context",
                        created_by=created_by,
                    )
                    if created:
                        count += 1
        return count

    @staticmethod
    def _post_save_intelligence(
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        title: str,
        summary: str,
        narrative: str,
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        home_id = YoungPeopleLinkingService._resolve_home_id(conn, young_person_id)
        record = {
            "id": source_id,
            "source_table": source_table,
            "record_type": source_table,
            "young_person_id": young_person_id,
            "home_id": home_id,
            "title": title,
            "summary": summary,
            "narrative": narrative,
            "metadata": metadata,
        }
        try:
            return plan_flow_service.after_record_saved(
                record=record,
                visible_records=[],
                young_person_id=young_person_id,
                home_id=home_id,
            )
        except Exception as exc:
            return {
                "draft_suggestions_only": True,
                "auto_finalised": False,
                "warning": "review recommended: post-save intelligence could not be prepared.",
                "error": str(exc),
            }
