from __future__ import annotations

"""ORB Residential project memory sync — server-side projects with localStorage fallback."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import require_orb_residential_auth
from db.connection import get_db
from db.orb_projects_db import (
    create_orb_project,
    delete_orb_project,
    get_orb_project,
    link_orb_project_chat,
    list_orb_projects,
    unlink_orb_project_chat,
    update_orb_project,
)

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


@router.get("/")
async def list_projects(
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    projects = list_orb_projects(conn, user_id=user_id)
    return projects


@router.post("/")
async def create_project(
    payload: OrbProjectCreateRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
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


@router.patch("/{project_id}")
async def patch_project(
    project_id: str,
    payload: OrbProjectPatchRequest,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    project = update_orb_project(
        conn,
        user_id=user_id,
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        memory=payload.memory,
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    conn.commit()
    return project


@router.delete("/{project_id}")
async def remove_project(
    project_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    deleted = delete_orb_project(conn, user_id=user_id, project_id=project_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    conn.commit()
    return {"ok": True}


@router.post("/{project_id}/chats/{chat_id}")
async def attach_chat_to_project(
    project_id: str,
    chat_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    project = link_orb_project_chat(conn, user_id=user_id, project_id=project_id, chat_id=chat_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    conn.commit()
    return project


@router.delete("/{project_id}/chats/{chat_id}")
async def detach_chat_from_project(
    project_id: str,
    chat_id: str,
    conn=Depends(get_db),
    current_user=Depends(require_orb_residential_auth),
):
    user_id = int(current_user["user_id"])
    project = unlink_orb_project_chat(conn, user_id=user_id, project_id=project_id, chat_id=chat_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    conn.commit()
    return project
