from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.audit_event_service import record_audit_event
from services.session_security_service import (
    list_user_sessions,
    revoke_session,
    revoke_user_sessions,
)

router = APIRouter(prefix="/session-security", tags=["session-security"])


class RevokeSessionRequest(BaseModel):
    session_id: str


@router.get("/sessions")
def get_sessions(request: Request, current_user=Depends(get_current_user), conn=Depends(get_db)):
    sessions = list_user_sessions(int(current_user["id"]), conn=conn)
    record_audit_event(
        event_type="session.list",
        action="list_sessions",
        request=request,
        actor=current_user,
        metadata={"count": len(sessions)},
    )
    return {"ok": True, "sessions": sessions}


@router.post("/revoke")
def revoke_single_session(payload: RevokeSessionRequest, request: Request, current_user=Depends(get_current_user), conn=Depends(get_db)):
    changed = revoke_session(payload.session_id, reason="user_revoke", conn=conn)
    if not changed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    record_audit_event(
        event_type="session.revoked",
        action="revoke_session",
        request=request,
        actor=current_user,
        resource_type="session",
        resource_id=payload.session_id,
    )

    return {"ok": True, "revoked": True}


@router.post("/revoke-all")
def revoke_all_sessions(request: Request, current_user=Depends(get_current_user), conn=Depends(get_db)):
    current_session_id = request.session.get("session_id")
    revoked = revoke_user_sessions(
        int(current_user["id"]),
        except_session_id=current_session_id,
        reason="user_revoke_all",
        conn=conn,
    )

    record_audit_event(
        event_type="session.revoked_all",
        action="revoke_all_sessions",
        request=request,
        actor=current_user,
        metadata={"revoked_count": revoked},
    )

    return {"ok": True, "revoked_count": revoked}
