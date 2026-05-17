from sqlalchemy import Column, Integer, String, ForeignKey
from .base import Base

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey('subjects.id'))
    title = Column(String)
