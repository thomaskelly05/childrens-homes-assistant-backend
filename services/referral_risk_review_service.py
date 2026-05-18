from __future__ import annotations

from typing import Any

VALID_REVIEW_STATUSES = {"confirmed", "overridden", "dismissed", "needs_more_information", "pending"}


class ReferralRiskReviewService:
    @staticmethod
    def ensure_schema(conn) -> None:
        with conn.cursor() as cur:
            cur.execute(open("sql/071_referral_risk_review.sql", "r", encoding="utf-8").read())
        conn.commit()

    @staticmethod
    def list_flags(conn, *, referral_id: int, status: str | None = None) -> list[dict[str, Any]]:
        ReferralRiskReviewService.ensure_schema(conn)
        params: list[Any] = [referral_id]
        clause = "WHERE referral_id = %s"
        if status:
            clause += " AND manager_review_status = %s"
            params.append(status)
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT *
                FROM referral_extracted_risk_flags
                {clause}
                ORDER BY
                    CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                    id
                """,
                tuple(params),
            )
            return [dict(row) for row in (cur.fetchall() or [])]

    @staticmethod
    def review_flag(
        conn,
        *,
        referral_id: int,
        flag_id: int,
        status: str,
        payload: dict[str, Any] | None = None,
        actor_user_id: int | None = None,
    ) -> dict[str, Any]:
        ReferralRiskReviewService.ensure_schema(conn)
        if status not in VALID_REVIEW_STATUSES:
            raise ValueError("Unsupported review status")
        data = dict(payload or {})
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE referral_extracted_risk_flags
                SET manager_review_status = %s,
                    manager_review_note = COALESCE(%s, manager_review_note),
                    manager_override_severity = COALESCE(%s, manager_override_severity),
                    manager_override_label = COALESCE(%s, manager_override_label),
                    manager_reviewed_by = %s,
                    manager_reviewed_at = NOW()
                WHERE id = %s
                  AND referral_id = %s
                RETURNING *
                """,
                (
                    status,
                    data.get("review_note") or data.get("manager_review_note") or data.get("note"),
                    data.get("manager_override_severity") or data.get("severity"),
                    data.get("manager_override_label") or data.get("label"),
                    actor_user_id,
                    flag_id,
                    referral_id,
                ),
            )
            row = cur.fetchone()
        if not row:
            raise ValueError("Referral risk flag not found")
        conn.commit()
        return dict(row)

    @staticmethod
    def summary(conn, *, referral_id: int) -> dict[str, Any]:
        ReferralRiskReviewService.ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT manager_review_status, COUNT(*)::int AS count
                FROM referral_extracted_risk_flags
                WHERE referral_id = %s
                GROUP BY manager_review_status
                """,
                (referral_id,),
            )
            counts = {row["manager_review_status"]: row["count"] for row in (cur.fetchall() or [])}
        total = sum(counts.values())
        return {
            "total": total,
            "pending": counts.get("pending", 0),
            "confirmed": counts.get("confirmed", 0),
            "overridden": counts.get("overridden", 0),
            "dismissed": counts.get("dismissed", 0),
            "needs_more_information": counts.get("needs_more_information", 0),
            "ready_for_matching": total > 0 and counts.get("pending", 0) == 0,
        }
