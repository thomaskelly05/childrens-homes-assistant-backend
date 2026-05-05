from __future__ import annotations

from flask import Blueprint, request, jsonify

ai_audit_bp = Blueprint("ai_audit", __name__)


@ai_audit_bp.route("/api/ai-audit", methods=["GET"])
def list_ai_logs():
    conn = request.environ.get("db")
    user = request.environ.get("user") or {}

    if not conn:
        return jsonify({"error": "Database unavailable"}), 500

    limit = int(request.args.get("limit", 50))

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, home_id, young_person_id,
                   assistant_type, assistant_surface, scope_type,
                   response_preview, requires_citations,
                   defensible_output_contract, created_at
            FROM ai_audit_logs
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        )

        rows = cur.fetchall()

    return jsonify(rows)


@ai_audit_bp.route("/api/ai-audit/<int:log_id>", methods=["GET"])
def get_ai_log(log_id: int):
    conn = request.environ.get("db")

    if not conn:
        return jsonify({"error": "Database unavailable"}), 500

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT * FROM ai_audit_logs WHERE id = %s
            """,
            (log_id,),
        )

        row = cur.fetchone()

    if not row:
        return jsonify({"error": "Not found"}), 404

    return jsonify(row)
