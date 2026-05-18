from __future__ import annotations

from typing import Any

RISK_FLAGS = {
    "autism": ("Autism", "medium"),
    "learning_disability": ("Learning disability", "medium"),
    "global_developmental_delay": ("Global developmental delay", "medium"),
    "trauma": ("Trauma history", "medium"),
    "cse": ("CSE risk", "high"),
    "knife": ("Knife/weapons risk", "high"),
    "fire": ("Fire setting", "high"),
    "self_harm": ("Self-harm", "high"),
    "suicidal": ("Suicidal ideation", "high"),
    "aggression": ("Physical aggression", "high"),
    "sexualised": ("Sexualised behaviour", "high"),
    "missing": ("Missing from care", "high"),
    "substance": ("Substance misuse", "medium"),
    "criminal_exploitation": ("Criminal exploitation", "high"),
    "gang": ("Gang affiliation", "high"),
    "high_supervision": ("High supervision", "high"),
}

CAPABILITY_MAP = {
    "autism": "accepts_autism",
    "learning_disability": "accepts_learning_disability",
    "global_developmental_delay": "accepts_global_developmental_delay",
    "trauma": "accepts_trauma_history",
    "cse": "accepts_cse_risk",
    "knife": "accepts_knife_risk",
    "fire": "accepts_fire_setting",
    "self_harm": "accepts_self_harm",
    "suicidal": "accepts_suicidal_ideation",
    "aggression": "accepts_physical_aggression",
    "sexualised": "accepts_sexualised_behaviour",
    "missing": "accepts_missing_from_care",
    "substance": "accepts_substance_misuse",
    "criminal_exploitation": "accepts_criminal_exploitation",
    "gang": "accepts_gang_affiliation",
    "high_supervision": "accepts_high_supervision",
}

CONFLICT_PAIRS = {
    ("cse", "sexualised"),
    ("criminal_exploitation", "gang"),
    ("knife", "aggression"),
    ("fire", "trauma"),
    ("self_harm", "suicidal"),
    ("missing", "criminal_exploitation"),
    ("substance", "criminal_exploitation"),
}

REGULATORY_MAPPING = {
    "quality_standards": [
        "reg_6_quality_and_purpose",
        "reg_7_children_views_wishes_and_feelings",
        "reg_8_education",
        "reg_10_health_and_wellbeing",
        "reg_11_positive_relationships",
        "reg_12_protection_of_children",
        "reg_13_leadership_and_management",
    ],
    "sccif_judgement_areas": [
        "overall_experiences_and_progress",
        "help_and_protection",
        "effectiveness_of_leaders_and_managers",
    ],
    "matching_rationale": "Referral matching must consider whether the home can meet the child’s needs, whether risks can be safely managed, and the likely impact on children already living in the home.",
}


class ReferralMatchingService:
    @staticmethod
    def ensure_schema(conn) -> None:
        with conn.cursor() as cur:
            cur.execute(open("sql/070_referral_matching_portal.sql", "r", encoding="utf-8").read())
        conn.commit()

    @staticmethod
    def list_capabilities(conn, *, home_id: int | None = None) -> list[dict[str, Any]]:
        ReferralMatchingService.ensure_schema(conn)
        with conn.cursor() as cur:
            if home_id:
                cur.execute("SELECT * FROM referral_home_matching_capabilities WHERE home_id = %s", (home_id,))
            else:
                cur.execute("SELECT * FROM referral_home_matching_capabilities ORDER BY home_id")
            return [dict(row) for row in (cur.fetchall() or [])]

    @staticmethod
    def upsert_capability(conn, *, home_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        data = dict(payload or {})
        data["home_id"] = home_id
        data["updated_by"] = actor_user_id
        columns = [
            "home_id", "manager_user_id", "accepts_age_min", "accepts_age_max", "accepts_gender",
            "accepts_autism", "accepts_learning_disability", "accepts_global_developmental_delay",
            "accepts_trauma_history", "accepts_cse_risk", "accepts_knife_risk", "accepts_fire_setting",
            "accepts_self_harm", "accepts_suicidal_ideation", "accepts_physical_aggression",
            "accepts_sexualised_behaviour", "accepts_missing_from_care", "accepts_substance_misuse",
            "accepts_criminal_exploitation", "accepts_gang_affiliation", "accepts_high_supervision",
            "accepts_deprivation_of_liberty", "current_capacity", "emergency_bed_available",
            "matching_notes", "exclusion_notes", "updated_by",
        ]
        values = {column: data.get(column) for column in columns}
        update_cols = [column for column in columns if column != "home_id"]
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO referral_home_matching_capabilities ({', '.join(columns)})
                VALUES ({', '.join('%(' + column + ')s' for column in columns)})
                ON CONFLICT (home_id) DO UPDATE SET
                    {', '.join(column + ' = EXCLUDED.' + column for column in update_cols)},
                    updated_at = NOW()
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row)

    @staticmethod
    def create_referral(conn, *, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        data = dict(payload or {})
        data.setdefault("regulatory_mapping", REGULATORY_MAPPING)
        data["created_by"] = actor_user_id
        data["updated_by"] = actor_user_id
        columns = [
            "referral_reference", "status", "source_local_authority", "referrer_name", "referrer_email",
            "referrer_phone", "young_person_first_name", "young_person_last_name", "preferred_name",
            "date_of_birth", "age", "gender", "legal_status", "care_status", "current_placement_type",
            "requested_start_date", "urgency", "reason_for_referral", "presenting_needs", "known_diagnoses",
            "communication_needs", "education_summary", "health_summary", "medication_summary",
            "family_contact_summary", "risk_summary", "strengths_summary", "child_voice",
            "ai_extraction_status", "ai_confidence", "extracted_metadata", "regulatory_mapping",
            "created_by", "updated_by",
        ]
        values = {column: data.get(column) for column in columns}
        values["status"] = values.get("status") or "received"
        values["ai_extraction_status"] = values.get("ai_extraction_status") or "pending"
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO referral_cases ({', '.join(columns)})
                VALUES ({', '.join('%(' + column + ')s' for column in columns)})
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()
        conn.commit()
        return dict(row)

    @staticmethod
    def list_referrals(conn, *, status: str | None = None, home_id: int | None = None) -> list[dict[str, Any]]:
        ReferralMatchingService.ensure_schema(conn)
        params: list[Any] = []
        where = []
        if status:
            where.append("status = %s")
            params.append(status)
        if home_id:
            where.append("recommended_home_id = %s")
            params.append(home_id)
        clause = "WHERE " + " AND ".join(where) if where else ""
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM referral_cases {clause} ORDER BY created_at DESC, id DESC", tuple(params))
            return [dict(row) for row in (cur.fetchall() or [])]

    @staticmethod
    def get_referral(conn, referral_id: int) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM referral_cases WHERE id = %s", (referral_id,))
            row = cur.fetchone()
            if not row:
                raise ValueError("Referral not found")
            referral = dict(row)
            cur.execute("SELECT * FROM referral_documents WHERE referral_id = %s ORDER BY created_at DESC", (referral_id,))
            referral["documents"] = [dict(item) for item in (cur.fetchall() or [])]
            cur.execute("SELECT * FROM referral_extracted_risk_flags WHERE referral_id = %s ORDER BY severity DESC, id", (referral_id,))
            referral["risk_flags"] = [dict(item) for item in (cur.fetchall() or [])]
            cur.execute("SELECT * FROM referral_matching_assessments WHERE referral_id = %s ORDER BY fit_score DESC", (referral_id,))
            referral["matching_assessments"] = [dict(item) for item in (cur.fetchall() or [])]
            cur.execute("SELECT * FROM referral_peer_risk_weightings WHERE referral_id = %s ORDER BY risk_weight DESC", (referral_id,))
            referral["peer_weightings"] = [dict(item) for item in (cur.fetchall() or [])]
        return referral

    @staticmethod
    def infer_flags_from_text(text: str | None) -> list[dict[str, Any]]:
        lower = str(text or "").lower()
        flags = []
        keywords = {
            "autism": ["autism", "autistic", "asd"],
            "learning_disability": ["learning disability", "learning difficulties"],
            "global_developmental_delay": ["global developmental delay", "gdd"],
            "trauma": ["trauma", "adverse childhood", "aces"],
            "cse": ["cse", "sexual exploitation"],
            "knife": ["knife", "weapon"],
            "fire": ["fire setting", "arson", "fire-setting"],
            "self_harm": ["self harm", "self-harm"],
            "suicidal": ["suicidal", "suicide ideation", "suicidal ideation"],
            "aggression": ["aggression", "assault", "violent", "violence"],
            "sexualised": ["sexualised", "sexualized"],
            "missing": ["missing from care", "missing episode", "abscond"],
            "substance": ["substance", "cannabis", "alcohol", "drug use"],
            "criminal_exploitation": ["criminal exploitation", "county lines"],
            "gang": ["gang"],
            "high_supervision": ["high supervision", "2:1", "two to one"],
        }
        for key, words in keywords.items():
            if any(word in lower for word in words):
                label, severity = RISK_FLAGS[key]
                flags.append({"flag_key": key, "flag_label": label, "severity": severity, "evidence": f"Keyword match: {', '.join(words)}", "confidence": 0.65})
        return flags

    @staticmethod
    def add_document(conn, *, referral_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        text = payload.get("extracted_text") or ""
        flags = ReferralMatchingService.infer_flags_from_text(text)
        inferred = ReferralMatchingService.extract_referral_fields_from_text(text)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO referral_documents (
                    referral_id, document_type, title, file_name, file_url, file_type,
                    extracted_text, extracted_metadata, extraction_status, uploaded_by
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
                """,
                (
                    referral_id,
                    payload.get("document_type") or "referral_document",
                    payload.get("title"),
                    payload.get("file_name"),
                    payload.get("file_url"),
                    payload.get("file_type"),
                    text,
                    {**(payload.get("extracted_metadata") or {}), "inferred_fields": inferred},
                    "extracted" if text else "pending",
                    actor_user_id,
                ),
            )
            doc = dict(cur.fetchone())
            for flag in flags:
                cur.execute(
                    """
                    INSERT INTO referral_extracted_risk_flags
                    (referral_id, flag_key, flag_label, severity, evidence, confidence, source_document_id)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (referral_id, flag["flag_key"], flag["flag_label"], flag["severity"], flag["evidence"], flag["confidence"], doc["id"]),
                )
            update_values = {
                "ai_extraction_status": "extracted" if text else "pending",
                "ai_confidence": 0.65 if flags or inferred else None,
                "extracted_metadata": {"document_flag_count": len(flags), "inferred_fields": inferred},
                "reason_for_referral": inferred.get("reason_for_referral"),
                "presenting_needs": inferred.get("presenting_needs"),
                "risk_summary": inferred.get("risk_summary"),
                "education_summary": inferred.get("education_summary"),
                "health_summary": inferred.get("health_summary"),
                "family_contact_summary": inferred.get("family_contact_summary"),
                "child_voice": inferred.get("child_voice"),
                "referral_id": referral_id,
            }
            cur.execute(
                """
                UPDATE referral_cases
                SET ai_extraction_status = %(ai_extraction_status)s,
                    ai_confidence = COALESCE(%(ai_confidence)s, ai_confidence),
                    extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb) || %(extracted_metadata)s::jsonb,
                    reason_for_referral = COALESCE(reason_for_referral, %(reason_for_referral)s),
                    presenting_needs = COALESCE(presenting_needs, %(presenting_needs)s),
                    risk_summary = COALESCE(risk_summary, %(risk_summary)s),
                    education_summary = COALESCE(education_summary, %(education_summary)s),
                    health_summary = COALESCE(health_summary, %(health_summary)s),
                    family_contact_summary = COALESCE(family_contact_summary, %(family_contact_summary)s),
                    child_voice = COALESCE(child_voice, %(child_voice)s),
                    updated_at = NOW()
                WHERE id = %(referral_id)s
                """,
                update_values,
            )
        conn.commit()
        return doc

    @staticmethod
    def extract_referral_fields_from_text(text: str | None) -> dict[str, str]:
        source = " ".join(str(text or "").split())
        lower = source.lower()
        if not source:
            return {}

        def window_after(label_words: list[str], chars: int = 420) -> str | None:
            for label in label_words:
                idx = lower.find(label)
                if idx >= 0:
                    return source[idx: idx + chars].strip()
            return None

        inferred = {
            "reason_for_referral": window_after(["reason for referral", "placement request", "referral reason"], 360),
            "presenting_needs": window_after(["presenting needs", "needs", "support needs"], 420),
            "risk_summary": window_after(["risk", "risks", "safeguarding"], 460),
            "education_summary": window_after(["education", "school", "ehcp"], 360),
            "health_summary": window_after(["health", "diagnosis", "diagnoses", "medication"], 360),
            "family_contact_summary": window_after(["family", "contact", "parent"], 360),
            "child_voice": window_after(["child voice", "wishes and feelings", "young person says"], 360),
        }
        return {key: value for key, value in inferred.items() if value}

    @staticmethod
    def _existing_child_risk_text(conn, young_person_id: int) -> str:
        chunks: list[str] = []
        with conn.cursor() as cur:
            for table, cols in (
                ("risk_assessments", ("title", "concern_summary", "summary")),
                ("incidents", ("incident_type", "description", "outcome")),
                ("safeguarding_records", ("title", "concern_summary", "narrative")),
                ("missing_episodes", ("missing_context", "return_interview_summary", "risk_summary")),
            ):
                try:
                    cur.execute(
                        f"""
                        SELECT * FROM {table}
                        WHERE young_person_id = %s
                        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
                        LIMIT 5
                        """,
                        (young_person_id,),
                    )
                    for row in cur.fetchall() or []:
                        item = dict(row)
                        chunks.extend(str(item.get(col) or "") for col in cols)
                except Exception:
                    continue
        return " ".join(part for part in chunks if part)

    @staticmethod
    def weight_peer_risk(conn, *, referral_id: int, home_id: int) -> list[dict[str, Any]]:
        ReferralMatchingService.ensure_schema(conn)
        referral = ReferralMatchingService.get_referral(conn, referral_id)
        incoming_flags = {flag.get("flag_key"): flag for flag in referral.get("risk_flags") or [] if flag.get("flag_key")}
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM referral_peer_risk_weightings
                WHERE referral_id = %s AND home_id = %s
                """,
                (referral_id, home_id),
            )
            cur.execute(
                """
                SELECT id, first_name, last_name, preferred_name
                FROM young_people
                WHERE home_id = %s
                  AND COALESCE(status, 'active') IN ('active', 'living', 'placed')
                ORDER BY id
                """,
                (home_id,),
            )
            children = [dict(row) for row in (cur.fetchall() or [])]

        created: list[dict[str, Any]] = []
        for child in children:
            yp_id = int(child["id"])
            child_flags = {flag.get("flag_key") for flag in ReferralMatchingService.infer_flags_from_text(ReferralMatchingService._existing_child_risk_text(conn, yp_id))}
            if not child_flags:
                continue
            for incoming_key, incoming in incoming_flags.items():
                if incoming_key in child_flags:
                    level = "high_overlap" if incoming.get("severity") == "high" else "medium_overlap"
                    weight = 18 if incoming.get("severity") == "high" else 10
                    rationale = f"Incoming referral and current young person both show {incoming.get('flag_label') or incoming_key}."
                elif any((incoming_key, child_key) in CONFLICT_PAIRS or (child_key, incoming_key) in CONFLICT_PAIRS for child_key in child_flags):
                    level = "known_interaction_risk"
                    weight = 14 if incoming.get("severity") == "high" else 8
                    rationale = f"Incoming referral flag {incoming.get('flag_label') or incoming_key} may interact with current household risks."
                else:
                    continue
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO referral_peer_risk_weightings (
                            referral_id, home_id, existing_young_person_id, risk_domain,
                            compatibility_level, risk_weight, rationale, protective_factors
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                        RETURNING *
                        """,
                        (
                            referral_id,
                            home_id,
                            yp_id,
                            incoming_key,
                            level,
                            weight,
                            rationale,
                            "Requires manager review of routines, staffing, bedroom location, triggers and protective relationships before acceptance.",
                        ),
                    )
                    created.append(dict(cur.fetchone()))
        conn.commit()
        return created

    @staticmethod
    def peer_impact_summary(weightings: list[dict[str, Any]]) -> str:
        if not weightings:
            return "No direct peer-risk overlap was identified from currently available records. Manager review is still required."
        total = sum(float(item.get("risk_weight") or 0) for item in weightings)
        highest = sorted(weightings, key=lambda item: float(item.get("risk_weight") or 0), reverse=True)[:3]
        domains = ", ".join(dict.fromkeys(str(item.get("risk_domain")) for item in highest if item.get("risk_domain")))
        return f"Peer-risk review found {len(weightings)} household compatibility flags with total peer weighting {total:.0f}. Main domains: {domains}."

    @staticmethod
    def score_home(conn, *, referral_id: int, home_id: int, actor_user_id: int | None = None) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        referral = ReferralMatchingService.get_referral(conn, referral_id)
        caps = ReferralMatchingService.list_capabilities(conn, home_id=home_id)
        capability = caps[0] if caps else {}
        flags = referral.get("risk_flags") or []
        unmet = []
        matched = {}
        risk_score = 0.0
        fit_score = 70.0
        for flag in flags:
            key = flag.get("flag_key")
            cap_key = CAPABILITY_MAP.get(key)
            accepted = bool(capability.get(cap_key)) if cap_key else False
            matched[key] = accepted
            severity = flag.get("severity") or "medium"
            weight = 15 if severity == "high" else 8
            if accepted:
                fit_score += 2
            else:
                fit_score -= weight
                risk_score += weight
                unmet.append({"flag_key": key, "label": flag.get("flag_label"), "severity": severity})
        if capability.get("current_capacity", 0) <= 0 and not capability.get("emergency_bed_available"):
            fit_score -= 30
            unmet.append({"flag_key": "capacity", "label": "No current capacity", "severity": "high"})
        peer_weightings = ReferralMatchingService.weight_peer_risk(conn, referral_id=referral_id, home_id=home_id)
        peer_weight = sum(float(item.get("risk_weight") or 0) for item in peer_weightings)
        risk_score += peer_weight
        fit_score -= min(35.0, peer_weight / 2)
        fit_score = max(0.0, min(100.0, fit_score))
        status = "potential_match" if fit_score >= 70 and not unmet and peer_weight < 20 else "needs_review" if fit_score >= 45 else "not_recommended"
        peer_summary = ReferralMatchingService.peer_impact_summary(peer_weightings)
        rationale = {
            **REGULATORY_MAPPING,
            "unmet_needs_count": len(unmet),
            "fit_score": fit_score,
            "risk_score": risk_score,
            "peer_risk_weight": peer_weight,
            "peer_weighting_count": len(peer_weightings),
        }
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO referral_matching_assessments (
                    referral_id, home_id, manager_user_id, fit_score, risk_score,
                    compatibility_status, matched_capabilities, unmet_needs,
                    peer_impact_summary, recommendation, regulatory_rationale,
                    created_by, updated_by
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (referral_id, home_id) DO UPDATE SET
                    fit_score = EXCLUDED.fit_score,
                    risk_score = EXCLUDED.risk_score,
                    compatibility_status = EXCLUDED.compatibility_status,
                    matched_capabilities = EXCLUDED.matched_capabilities,
                    unmet_needs = EXCLUDED.unmet_needs,
                    peer_impact_summary = EXCLUDED.peer_impact_summary,
                    recommendation = EXCLUDED.recommendation,
                    regulatory_rationale = EXCLUDED.regulatory_rationale,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
                RETURNING *
                """,
                (
                    referral_id,
                    home_id,
                    capability.get("manager_user_id"),
                    fit_score,
                    risk_score,
                    status,
                    matched,
                    unmet,
                    peer_summary,
                    status,
                    rationale,
                    actor_user_id,
                    actor_user_id,
                ),
            )
            row = dict(cur.fetchone())
        conn.commit()
        return row

    @staticmethod
    def score_all_homes(conn, *, referral_id: int, actor_user_id: int | None = None) -> list[dict[str, Any]]:
        capabilities = ReferralMatchingService.list_capabilities(conn)
        return [ReferralMatchingService.score_home(conn, referral_id=referral_id, home_id=int(cap["home_id"]), actor_user_id=actor_user_id) for cap in capabilities]

    @staticmethod
    def convert_to_young_person(conn, *, referral_id: int, home_id: int, actor_user_id: int | None = None) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        referral = ReferralMatchingService.get_referral(conn, referral_id)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO young_people (
                    home_id, first_name, last_name, preferred_name, date_of_birth,
                    gender, status, created_at, updated_at
                ) VALUES (%s,%s,%s,%s,%s,%s,'active',NOW(),NOW())
                RETURNING *
                """,
                (
                    home_id,
                    referral.get("young_person_first_name") or "Referral",
                    referral.get("young_person_last_name") or str(referral_id),
                    referral.get("preferred_name"),
                    referral.get("date_of_birth"),
                    referral.get("gender"),
                ),
            )
            young_person = dict(cur.fetchone())
            yp_id = young_person["id"]
            cur.execute(
                """
                INSERT INTO support_plans (young_person_id, title, summary, status, approval_status, created_by, created_at, updated_at)
                VALUES (%s,%s,%s,'draft','draft',%s,NOW(),NOW())
                RETURNING *
                """,
                (yp_id, "Initial referral-informed care plan", referral.get("presenting_needs") or referral.get("reason_for_referral") or "Created from referral information.", actor_user_id),
            )
            care_plan = dict(cur.fetchone())
            cur.execute(
                """
                INSERT INTO risk_assessments (young_person_id, title, concern_summary, severity, status, approval_status, created_by, created_at, updated_at)
                VALUES (%s,%s,%s,'high','draft','draft',%s,NOW(),NOW())
                RETURNING *
                """,
                (yp_id, "Initial matching risk assessment", referral.get("risk_summary") or "Created from referral risk flags and matching assessment.", actor_user_id),
            )
            risk = dict(cur.fetchone())
            cur.execute(
                """
                UPDATE referral_cases
                SET status = 'converted', manager_decision = 'accepted', recommended_home_id = %s,
                    converted_young_person_id = %s, converted_at = NOW(), updated_by = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (home_id, yp_id, actor_user_id, referral_id),
            )
            updated_referral = dict(cur.fetchone())
        conn.commit()
        return {"referral": updated_referral, "young_person": young_person, "initial_care_plan": care_plan, "matching_risk_assessment": risk}
