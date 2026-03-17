import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Photos"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "frontend", "assets", "uploads", "young_people")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{young_person_id}/photo")
def upload_young_person_photo(
    young_person_id: int,
    photo: UploadFile = File(...),
    conn=Depends(get_db),
):
    try:
        ext = os.path.splitext(photo.filename or "")[1].lower() or ".jpg"
        filename = f"young_person_{young_person_id}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        public_url = f"/assets/uploads/young_people/{filename}"

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_people
                SET photo_url = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, photo_url, updated_at
                """,
                (public_url, young_person_id),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Young person not found")

        conn.commit()
        return row

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")
