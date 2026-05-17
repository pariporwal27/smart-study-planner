from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, get_db
from app.models import base
from app import schemas
from app.models.user import User
from app.models.subject import Subject
from app.models.task import Task

from app.api import schedule

# Create database tables
base.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(schedule.router, prefix="/api/v1/schedule", tags=["Schedule"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart Study Planner API!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

