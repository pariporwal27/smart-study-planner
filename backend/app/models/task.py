from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from .base import Base
import datetime

class Task(Base):
    __tablename__ = 'tasks'
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey('subjects.id'))
    title = Column(String, index=True, nullable=False)
    deadline = Column(DateTime, nullable=True)
    estimated_minutes = Column(Integer, default=60)
    status = Column(String, default="pending")  # pending, completed

    subject = relationship("Subject", back_populates="tasks")
    sessions = relationship("StudySession", back_populates="task", cascade="all, delete-orphan")

class StudySession(Base):
    __tablename__ = 'study_sessions'
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('tasks.id'))
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=0)
    focus_rating = Column(Integer, nullable=True)  # 1 to 5

    task = relationship("Task", back_populates="sessions")
