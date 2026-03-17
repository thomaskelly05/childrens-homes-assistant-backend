import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Statutory Documents"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "frontend", "assets", "uploads", "statutory_documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/{young_person_id}/statutory-documents")
def list_statutory_documents(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM statutory_documents
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY
                    review_date ASC NULLS LAST,
                    expiry_date ASC NULLS LAST,
                    created_at DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load statutory documents: {str(e)}")


@router.get("/{young_person_id}/statutory-documents/archive")
def list_statutory_documents_archive(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM statutory_documents
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = TRUE
                ORDER BY created_at DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived statutory documents: {str(e)}")


@router.get("/statutory-documents/{document_id}")
def get_statutory_document(
    document_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM statutory_documents
                WHERE id = %s
                LIMIT 1
                """,
                (document_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Statutory document not found")

        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load statutory document: {str(e)}")


@router.post("/{young_person_id}/statutory-documents")
def create_statutory_document(
    young_person_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO statutory_documents (
                    young_person_id,
                    home_id,
                    document_type,
                    title,
                    description,
                    issue_date,
                    review_date,
                    expiry_date,
                    status,
                    compliance_category,
                    linked_standard_code,
                    uploaded_by,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    %(young_person_id)s,
                    %(home_id)s,
                    %(document_type)s,
                    %(title)s,
                    %(description)s,
                    %(issue_date)s,
                    %(review_date)s,
                    %(expiry_date)s,
                    COALESCE(%(status)s, 'current'),
                    %(compliance_category)s,
                    %(linked_standard_code)s,
                    %(uploaded_by)s,
                    COALESCE(%(archived)s, FALSE),
                    NOW(),
                    NOW()
                )
                RETURNING *
                """,
                {**payload, "young_person_id": young_person_id},
            )
            row = cur.fetchone()

        conn.commit()
        return row
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create statutory document: {str(e)}")


@router.put("/statutory-documents/{document_id}")
def update_statutory_document(
    document_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE statutory_documents
                SET
                    document_type = %(document_type)s,
                    title = %(title)s,
                    description = %(description)s,
                    issue_date = %(issue_date)s,
                    review_date = %(review_date)s,
                    expiry_date = %(expiry_date)s,
                    status = %(status)s,
                    compliance_category = %(compliance_category)s,
                    linked_standard_code = %(linked_standard_code)s,
                    archived = COALESCE(%(archived)s, archived),
                    updated_at = NOW()
                WHERE id = %(id)s
                RETURNING *
                """,
                {**payload, "id": document_id},
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Statutory document not found")

        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update statutory document: {str(e)}")


@router.post("/{young_person_id}/statutory-documents/upload")
def upload_statutory_document(
    young_person_id: int,
    document_type: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    issue_date: str = Form(None),
    review_date: str = Form(None),
    expiry_date: str = Form(None),
    status: str = Form("current"),
    compliance_category: str = Form(None),
    linked_standard_code: str = Form(None),
    uploaded_by: int = Form(None),
    home_id: int = Form(None),
    file: UploadFile = File(...),
    conn=Depends(get_db),
):
    try:
        ext = os.path.splitext(file.filename or "")[1].lower()
        safe_name = f"yp_{young_person_id}_{title.strip().replace(' ', '_')}_{document_type.strip().replace(' ', '_')}{ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_name)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        public_url = f"/assets/uploads/statutory_documents/{safe_name}"

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO statutory_documents (
                    young_person_id,
                    home_id,
                    document_type,
                    title,
                    description,
                    file_url,
                    file_name,
                    file_type,
                    issue_date,
                    review_date,
                    expiry_date,
                    status,
                    compliance_category,
                    linked_standard_code,
                    uploaded_by,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    FALSE,
                    NOW(),
                    NOW()
                )
                RETURNING *
                """,
                (
                    young_person_id,
                    home_id,
                    document_type,
                    title,
                    description,
                    public_url,
                    file.filename,
                    file.content_type,
                    issue_date,
                    review_date,
                    expiry_date,
                    status,
                    compliance_category,
                    linked_standard_code,
                    uploaded_by,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return row

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload statutory document: {str(e)}")
