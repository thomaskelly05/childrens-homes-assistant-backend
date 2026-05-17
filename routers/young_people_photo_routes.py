import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from core.policy_engine import policy_engine
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Photos"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "frontend", "assets", "uploads", "young_people")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_PHOTO_TYPES = {
    "image/png": (".png", b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": (".jpg", b"\xff\xd8\xff"),
    "image/webp": (".webp", b"RIFF"),
}
MAX_PHOTO_BYTES = 2_500_000


def _young_person_scope(conn, young_person_id: int) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, provider_id, home_id
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")
    return dict(row)


def _validate_photo(photo: UploadFile) -> tuple[str, bytes]:
    content_type = (photo.content_type or "").lower()
    if content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail="Photo must be PNG, JPEG or WebP.")
    ext, signature = ALLOWED_PHOTO_TYPES[content_type]
    data = photo.file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be 2.5MB or smaller.")
    if not data.startswith(signature):
        raise HTTPException(status_code=400, detail="Photo content does not match its MIME type.")
    return ext, data


@router.post("/{young_person_id}/photo")
def upload_young_person_photo(
    young_person_id: int,
    photo: UploadFile = File(...),
    conn=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        scope = _young_person_scope(conn, young_person_id)
        if not policy_engine.has_permission(
            current_user,
            "records:write",
            home_id=scope.get("home_id"),
        ):
            raise HTTPException(status_code=403, detail="You do not have permission to update this child profile.")
        ext, data = _validate_photo(photo)
        filename = f"young_person_{young_person_id}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            buffer.write(data)

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
