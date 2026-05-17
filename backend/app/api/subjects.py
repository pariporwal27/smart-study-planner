from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.subject import Subject
from app.schemas import Subject as SubjectSchema, SubjectCreate

router = APIRouter()

# In a real app with auth, we'd get the current_user ID.
# For now, we'll hardcode user_id=1 for demonstration.
MOCK_USER_ID = 1

@router.post("/", response_model=SubjectSchema)
def create_subject(subject: SubjectCreate, db: Session = Depends(get_db)):
    db_subject = Subject(**subject.model_dump(), user_id=MOCK_USER_ID)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@router.get("/", response_model=List[SubjectSchema])
def read_subjects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.user_id == MOCK_USER_ID).offset(skip).limit(limit).all()
    return subjects

@router.get("/{subject_id}", response_model=SubjectSchema)
def read_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == MOCK_USER_ID).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.delete("/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == MOCK_USER_ID).first()
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"ok": True}
