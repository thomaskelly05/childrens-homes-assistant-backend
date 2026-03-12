import os
import uuid
import shutil

from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from db.connection import get_db
from db.ai_notes_db import save_ai_note

from services.ai_notes_service import (
    transcribe_audio,
    generate_note,
    safeguarding_check
)

router = APIRouter(
    prefix="/ai-notes",
    tags=["AI Notes"]
)

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/transcribe")

async def transcribe(file: UploadFile = File(...)):

    file_id = str(uuid.uuid4())

    path = f"{UPLOAD_DIR}/{file_id}.wav"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    transcript = await transcribe_audio(path)

    return {"transcript": transcript}


@router.post("/generate")

async def generate(transcript: str = Form(...)):

    note = await generate_note(transcript)

    safeguarding = await safeguarding_check(transcript)

    return {
        "note": note,
        "safeguarding": safeguarding
    }


@router.post("/save")

async def save_note(
    child_id: int = Form(...),
    staff_id: int = Form(...),
    transcript: str = Form(...),
    note: str = Form(...),
    db: Session = Depends(get_db)
):

    record = save_ai_note(
        db,
        child_id,
        staff_id,
        transcript,
        note,
        note,
        0
    )

    return {
        "status": "saved",
        "id": record.id
    }
