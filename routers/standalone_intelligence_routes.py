from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.assistant_security import safe_int
from services.standalone_intelligence_store import (
    add_message,
    add_pin,
    add_upload,
    create_project,
    export_project,
    get_project,
    list_messages,
    list_projects,
    search_project,
    update_project,
)

router = APIRouter(prefix="/standalone-intelligence", tags=["Standalone Intelligence"])


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    mode: str | None = "ofsted"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    mode: str | None = None
    memorySummary: str | None = None
    suggestedActions: list[str] | None = None


class MessageCreate(BaseModel):
    role: str = "user"
    content: str = Field(..., min_length=1)
    conversationId: str | None = None


class PinCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    type: str | None = "output"


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=300)


class ProjectResponse(BaseModel):
    project: dict[str, Any]


class ProjectsResponse(BaseModel):
    projects: list[dict[str, Any]]


class MessagesResponse(BaseModel):
    messages: list[dict[str, Any]]


class SearchResponse(BaseModel):
    results: list[dict[str, Any]]


class GenericResponse(BaseModel):
    ok: bool = True


class UploadResponse(BaseModel):
    upload: dict[str, Any]


class PinResponse(BaseModel):
    pin: dict[str, Any]


class MessageResponse(BaseModel):
    message: dict[str, Any]


def _user_id(current_user: dict[str, Any]) -> int:
    user_id = safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user_id


@router.get("/projects", response_model=ProjectsResponse)
def projects(current_user=Depends(get_current_user)):
    return {"projects": list_projects(_user_id(current_user))}


@router.post("/projects", response_model=ProjectResponse)
def create(payload: ProjectCreate, current_user=Depends(get_current_user)):
    project = create_project(_user_id(current_user), payload.model_dump())
    return {"project": project}


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get(project_id: str, current_user=Depends(get_current_user)):
    project = get_project(_user_id(current_user), project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": project}


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def patch(project_id: str, payload: ProjectUpdate, current_user=Depends(get_current_user)):
    project = update_project(_user_id(current_user), project_id, payload.model_dump(exclude_none=True))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": project}


@router.get("/projects/{project_id}/messages", response_model=MessagesResponse)
def messages(project_id: str, current_user=Depends(get_current_user)):
    result = list_messages(_user_id(current_user), project_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"messages": result}


@router.post("/projects/{project_id}/messages", response_model=MessageResponse)
def message(project_id: str, payload: MessageCreate, current_user=Depends(get_current_user)):
    result = add_message(_user_id(current_user), project_id, payload.model_dump())
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": result}


@router.post("/projects/{project_id}/pins", response_model=PinResponse)
def pin(project_id: str, payload: PinCreate, current_user=Depends(get_current_user)):
    result = add_pin(_user_id(current_user), project_id, payload.model_dump())
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"pin": result}


@router.post("/projects/{project_id}/uploads", response_model=UploadResponse)
async def upload(
    project_id: str,
    file: UploadFile = File(...),
    text: str | None = Form(default=None),
    current_user=Depends(get_current_user),
):
    content = text
    if content is None:
        raw = await file.read()
        content = raw.decode("utf-8", errors="ignore")[:200000]

    result = add_upload(
        _user_id(current_user),
        project_id,
        file.filename or "upload.txt",
        content or "",
    )

    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"upload": result}


@router.post("/projects/{project_id}/search", response_model=SearchResponse)
def search(project_id: str, payload: SearchRequest, current_user=Depends(get_current_user)):
    results = search_project(_user_id(current_user), project_id, payload.query)
    if results is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"results": results}


@router.get("/projects/{project_id}/export", response_class=HTMLResponse)
def export(project_id: str, current_user=Depends(get_current_user)):
    html = export_project(_user_id(current_user), project_id)
    if html is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return HTMLResponse(html)
