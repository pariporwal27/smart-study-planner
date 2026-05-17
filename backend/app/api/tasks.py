from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.task import Task
from app.models.subject import Subject
from app.schemas import Task as TaskSchema, TaskCreate

router = APIRouter()

MOCK_USER_ID = 1

@router.post("/", response_model=TaskSchema)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    # Verify the subject belongs to the user
    subject = db.query(Subject).filter(Subject.id == task.subject_id, Subject.user_id == MOCK_USER_ID).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or access denied")
        
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/subject/{subject_id}", response_model=List[TaskSchema])
def read_tasks_by_subject(subject_id: int, db: Session = Depends(get_db)):
    # Verify subject
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == MOCK_USER_ID).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    tasks = db.query(Task).filter(Task.subject_id == subject_id).all()
    return tasks

@router.put("/{task_id}/status", response_model=TaskSchema)
def update_task_status(task_id: int, status: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Extra check to ensure task subject belongs to user could go here
    task.status = status
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}
