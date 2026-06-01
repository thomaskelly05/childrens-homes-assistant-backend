from __future__ import annotations

"""ORB Residential project memory sync — server-side projects with localStorage fallback."""

import logging
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from auth.errors import auth_error_detail
from auth.orb_residential_dependencies import require_orb_residential_auth
from db.connection import DatabaseUnavailableError, get_db
from db.orb_projects_db import (
    create_orb_project,
    delete_orb_project,
    get_orb_project,
    get_orb_project_chat_link,
    link_orb_project_chat,
    list_orb_projects,
    unlink_orb_project_chat,
    update_orb_project,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb/projects", tags=["ORB Residential Projects"])


class OrbProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str | None = Field(default=None, max_length=80)
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    memory: str | None = Field(default=None, max_length=20000)


class OrbProjectPatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    memory: str | None = Field(default=None, max_length=20000)


def _dev_log(event: str, **detail: Any) -> None:
    if os.getenv("APP_ENV", "development").strip().lower() != "development":
        return
    logger.debug("orb_projects %s %s", event, detail)


def _safe_http_exception(exc: HTTPException) -> HTTPException:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return exc
    message = str(exc.detail) if exc.detail else "Request failed"
    return HTTPException(
        status_code=exc.status_code,
        detail=auth_error_detail("orb_projects_error", message),
    )


def _service_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=auth_error_detail(
            "orb_projects_unavailable",
            "Projects are temporarily unavailable. Please try again shortly.",
        ),
    )


@router.get("")
@router.get("/")
async def list_projects(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        projects = list_orb_projects(conn, user_id=user_id)
        _dev_log("list_ok", user_id=user_id, count=len(projects))
        return projects
    except HTTPException as exc:
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError:
        logger.warning("orb_projects list unavailable (database)", exc_info=True)
        return []
    except Exception:
        logger.exception("orb_projects list failed user_id=%s", user_id)
        return []


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        project = get_orb_project(conn, user_id=user_id, project_id=project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=auth_error_detail("project_not_found", "Project not found"),
            )
        return project
    except HTTPException as exc:
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError as exc:
        raise _service_unavailable() from exc
    except Exception:
        logger.exception("orb_projects get failed user_id=%s project_id=%s", user_id, project_id)
        raise _service_unavailable() from None


@router.post("/")
async def create_project(
    payload: OrbProjectCreateRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        project = create_orb_project(
            conn,
            user_id=user_id,
            title=payload.title,
            description=payload.description,
            memory=payload.memory,
            project_id=payload.id,
        )
        conn.commit()
        return project
    except HTTPException as exc:
        conn.rollback()
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError as exc:
        conn.rollback()
        raise _service_unavailable() from exc
    except Exception:
        conn.rollback()
        logger.exception("orb_projects create failed user_id=%s", user_id)
        raise _service_unavailable() from None


@router.patch("/{project_id}")
async def patch_project(
    project_id: str,
    payload: OrbProjectPatchRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        project = update_orb_project(
            conn,
            user_id=user_id,
            project_id=project_id,
            title=payload.title,
            description=payload.description,
            memory=payload.memory,
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=auth_error_detail("project_not_found", "Project not found"),
            )
        conn.commit()
        return project
    except HTTPException as exc:
        conn.rollback()
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError as exc:
        conn.rollback()
        raise _service_unavailable() from exc
    except Exception:
        conn.rollback()
        logger.exception("orb_projects patch failed user_id=%s project_id=%s", user_id, project_id)
        raise _service_unavailable() from None


@router.delete("/{project_id}")
async def remove_project(
    project_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        deleted = delete_orb_project(conn, user_id=user_id, project_id=project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=auth_error_detail("project_not_found", "Project not found"),
            )
        conn.commit()
        return {"ok": True}
    except HTTPException as exc:
        conn.rollback()
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError as exc:
        conn.rollback()
        raise _service_unavailable() from exc
    except Exception:
        conn.rollback()
        logger.exception("orb_projects delete failed user_id=%s project_id=%s", user_id, project_id)
        raise _service_unavailable() from None


@router.get("/{project_id}/chats/{chat_id}")
async def get_project_chat(
    project_id: str,
    chat_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        project = get_orb_project(conn, user_id=user_id, project_id=project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=auth_error_detail("project_not_found", "Project not found"),
            )
        linked = get_orb_project_chat_link(conn, project_id=project_id, chat_id=chat_id)
        if not linked:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=auth_error_detail("chat_not_found", "Chat not found for this project"),
            )
        return {
            "project_id": project_id,
            "chat_id": chat_id.strip(),
            "linked": True,
            "project": project,
        }
    except HTTPException as exc:
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError as exc:
        raise _service_unavailable() from exc
    except Exception:
        logger.exception(
            "orb_projects chat get failed user_id=%s project_id=%s chat_id=%s",
            user_id,
            project_id,
            chat_id,
        )
        raise _service_unavailable() from None


@router.post("/{project_id}/chats/{chat_id}")
async def attach_chat_to_project(
    project_id: str,
    chat_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        project = link_orb_project_chat(conn, user_id=user_id, project_id=project_id, chat_id=chat_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=auth_error_detail("project_not_found", "Project not found"),
            )
        conn.commit()
        return project
    except HTTPException as exc:
        conn.rollback()
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError as exc:
        conn.rollback()
        raise _service_unavailable() from exc
    except Exception:
        conn.rollback()
        logger.exception(
            "orb_projects chat link failed user_id=%s project_id=%s chat_id=%s",
            user_id,
            project_id,
            chat_id,
        )
        raise _service_unavailable() from None


@router.delete("/{project_id}/chats/{chat_id}")
async def detach_chat_from_project(
    project_id: str,
    chat_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    try:
        project = unlink_orb_project_chat(conn, user_id=user_id, project_id=project_id, chat_id=chat_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=auth_error_detail("project_not_found", "Project not found"),
            )
        conn.commit()
        return project
    except HTTPException as exc:
        conn.rollback()
        raise _safe_http_exception(exc) from exc
    except DatabaseUnavailableError as exc:
        conn.rollback()
        raise _service_unavailable() from exc
    except Exception:
        conn.rollback()
        logger.exception(
            "orb_projects chat unlink failed user_id=%s project_id=%s chat_id=%s",
            user_id,
            project_id,
            chat_id,
        )
        raise _service_unavailable() from None
