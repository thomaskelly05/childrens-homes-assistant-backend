import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from services.ai_notes_service import (
    transcribe_audio,
    generate_note
)

router = APIRouter(
    prefix="/ai-notes",
    tags=["AI Notes"]
)

# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)


# --------------------------------------------------
# TRANSCRIBE AUDIO
# --------------------------------------------------

@router.post("/transcribe")
async def transcribe_note_audio(file: UploadFile = File(...)):

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    if file.size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Get real extension
    extension = os.path.splitext(file.filename)[1]

    if extension == "":
        extension = ".webm"

    # Only allow safe audio formats
    allowed = [".webm", ".wav", ".mp3", ".m4a", ".ogg"]

    if extension.lower() not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format"
        )

    temp_filename = f"{uuid.uuid4()}{extension}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        transcript = await transcribe_audio(temp_path)

        return {
            "ok": True,
            "transcript": transcript
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )

    finally:

        if os.path.exists(temp_path):
            os.remove(temp_path)


# --------------------------------------------------
# GENERATE MEETING NOTE
# --------------------------------------------------

@router.post("/generate")
async def generate_ai_note(transcript: str = Form(...)):

    transcript = transcript.strip()

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Transcript required"
        )

    try:

        note = await generate_note(transcript)

        return {
            "ok": True,
            "note": note
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"AI note generation failed: {str(e)}"
        )


# --------------------------------------------------
# DELETE MEETING NOTE
# --------------------------------------------------

@router.post("/delete")
async def delete_note():

    return {
        "ok": True,
        "message": "Meeting cleared"
    }
