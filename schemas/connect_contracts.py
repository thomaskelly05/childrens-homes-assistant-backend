from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


ThreadType = Literal["home_channel", "direct", "group", "handover"]
ThreadRole = Literal["owner", "member"]
MessagePriority = Literal["normal", "important", "urgent"]
Visibility = Literal["home", "provider", "members"]


class ConnectThreadCreate(BaseModel):
    thread_type: ThreadType = "home_channel"
    title: str = Field(..., min_length=1, max_length=180)
    home_id: int | None = None
    member_ids: list[int] = Field(default_factory=list)
    visibility: Visibility = "home"

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        text = " ".join(value.split())
        if not text:
            raise ValueError("title is required")
        return text

    @field_validator("member_ids")
    @classmethod
    def clean_members(cls, value: list[int]) -> list[int]:
        return sorted({int(item) for item in value if int(item) > 0})


class ConnectMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)
    linked_child_id: int | None = None
    linked_record_type: str | None = Field(default=None, max_length=80)
    linked_record_id: str | None = Field(default=None, max_length=120)
    priority: MessagePriority = "normal"

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("message body is required")
        return text


class ConnectMessageUpdate(BaseModel):
    body: str | None = Field(default=None, min_length=1, max_length=4000)
    priority: MessagePriority | None = None
    deleted: bool = False

    @field_validator("body")
    @classmethod
    def clean_optional_body(cls, value: str | None) -> str | None:
        if value is None:
            return None
        text = value.strip()
        if not text:
            raise ValueError("message body is required")
        return text


class ConnectThread(BaseModel):
    id: int
    provider_id: int | None = None
    home_id: int | None = None
    thread_type: ThreadType
    title: str
    created_by: int | None = None
    created_at: datetime | None = None
    archived_at: datetime | None = None
    unread_count: int = 0
    latest_message_at: datetime | None = None
    members: list[int] = Field(default_factory=list)


class ConnectMessage(BaseModel):
    id: int
    thread_id: int
    provider_id: int | None = None
    home_id: int | None = None
    author_id: int | None = None
    author_name: str | None = None
    body: str
    linked_child_id: int | None = None
    linked_record_type: str | None = None
    linked_record_id: str | None = None
    priority: MessagePriority = "normal"
    created_at: datetime | None = None
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    read_at: datetime | None = None


class ConnectNotification(BaseModel):
    id: int
    provider_id: int | None = None
    home_id: int | None = None
    user_id: int
    notification_type: str
    title: str
    body: str | None = None
    linked_thread_id: int | None = None
    linked_message_id: int | None = None
    linked_child_id: int | None = None
    read_at: datetime | None = None
    created_at: datetime | None = None


class HandoverEntryCreate(BaseModel):
    shift_date: str | None = None
    shift_type: str = Field(default="day", max_length=40)
    visibility: Visibility = "home"
    linked_child_id: int | None = None
    linked_record_type: str | None = Field(default=None, max_length=80)
    linked_record_id: str | None = Field(default=None, max_length=120)
    priority: MessagePriority = "normal"
    body: str = Field(..., min_length=1, max_length=4000)


class TodayResponse(BaseModel):
    adult: dict[str, Any]
    home: dict[str, Any] | None = None
    provider: dict[str, Any] | None = None
    handover: dict[str, Any]
    connect: dict[str, Any]
    notifications: dict[str, Any]
    tasks_due_today: list[dict[str, Any]]
    key_children: list[dict[str, Any]]
    recent_activity: list[dict[str, Any]]
    dashboard_preferences: dict[str, Any]
    generated_at: datetime
