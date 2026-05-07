from __future__ import annotations

from fastapi import APIRouter, HTTPException

from services.standalone_assistant_library import (
    get_standalone_library_item,
    list_standalone_library_items,
)

router = APIRouter(prefix="/assistant/library", tags=["Standalone Assistant Library"])


@router.get("/items")
def list_items():
    return {
        "surface": "standalone_assistant",
        "items": list_standalone_library_items(),
    }


@router.get("/items/{item_id}")
def get_item(item_id: str):
    item = get_standalone_library_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Library item not found")

    return {
        "surface": "standalone_assistant",
        "item": item,
    }
