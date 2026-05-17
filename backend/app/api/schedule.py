from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import pandas as pd

from app.services.model import train_models, load_training_data, allocate_study_hours
from app.services.planner_utils import build_subject_inputs, calculate_priority

router = APIRouter()

# Cache the trained model at startup
ML_MODEL_BUNDLE = None

def _get_or_train_model():
    global ML_MODEL_BUNDLE
    if ML_MODEL_BUNDLE is None:
        # Look for data relative to the backend root
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        csv_path = os.path.join(base, "data", "sample_data.csv")
        try:
            data = pd.read_csv(csv_path)
            ML_MODEL_BUNDLE = train_models(data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to train ML model: {str(e)} | path tried: {csv_path}")
    return ML_MODEL_BUNDLE

class SubjectInput(BaseModel):
    name: str
    difficulty: int   # 1-5
    past_score: int   # 0-100

class ScheduleRequest(BaseModel):
    subjects: List[SubjectInput]
    days_left: int
    total_hours_per_day: float

@router.post("/generate", response_model=Dict[str, Any])
def generate_schedule(request: ScheduleRequest):
    """Generate a smart study schedule using the ML model."""
    model_bundle = _get_or_train_model()

    subject_inputs = [
        {
            "subject": s.name,
            "difficulty": s.difficulty,
            "past_score": s.past_score,
            "days_left": request.days_left,
        }
        for s in request.subjects
    ]

    try:
        allocated = allocate_study_hours(
            model=model_bundle.best_model,
            subject_inputs=subject_inputs,
            total_available_hours=request.total_hours_per_day,
        )

        avg = sum(allocated) / len(allocated) if allocated.any() else 1

        result = []
        for inp, hrs in zip(subject_inputs, allocated):
            priority = calculate_priority(
                difficulty=inp["difficulty"],
                past_score=inp["past_score"],
                days_left=inp["days_left"],
                allocated_hours=float(hrs),
                average_hours=avg,
            )
            result.append({
                "subject": inp["subject"],
                "allocated_hours": round(float(hrs), 2),
                "priority": priority,
            })

        return {
            "schedule": result,
            "model_used": model_bundle.best_model_name,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
