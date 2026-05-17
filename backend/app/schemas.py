from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Subject Schemas ---
class SubjectBase(BaseModel):
    name: str
    difficulty_level: int = 3
    target_weekly_hours: float = 5.0

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskBase(BaseModel):
    title: str
    deadline: Optional[datetime] = None
    estimated_minutes: int = 60
    status: str = "pending"

class TaskCreate(TaskBase):
    subject_id: int

class Task(TaskBase):
    id: int
    subject_id: int

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    current_streak: int = 0
    highest_streak: int = 0
    total_xp: int = 0

    class Config:
        from_attributes = True
