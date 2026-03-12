from sqlalchemy.orm import Session
from models.ai_note_model import AINote


def save_ai_note(db: Session, child_id, staff_id, transcript, ai_draft, final_note, safeguarding):

    note = AINote(
        child_id=child_id,
        staff_id=staff_id,
        transcript=transcript,
        ai_draft=ai_draft,
        final_note=final_note,
        safeguarding_flag=safeguarding
    )

    db.add(note)
    db.commit()
    db.refresh(note)

    return note
