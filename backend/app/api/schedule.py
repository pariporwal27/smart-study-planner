from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.model import train_models, load_training_data, allocate_study_hours
from app.services.planner_utils import build_subject_inputs

router = APIRouter()

# Global variable to cache the trained model
ML_MODEL_BUNDLE = None

def get_ml_model():
    global ML_MODEL_BUNDLE
    if ML_MODEL_BUNDLE is None:
        try:
            data = load_training_data()
            ML_MODEL_BUNDLE = train_models(data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load ML model: {str(e)}")
    return ML_MODEL_BUNDLE

class SubjectInput(BaseModel):
    name: str
    difficulty: int  # 1 to 5
    past_score: int  # 0 to 100

class ScheduleRequest(BaseModel):
    subjects: List[SubjectInput]
    days_left: int
    total_hours_per_day: float

@router.post("/generate", response_model=Dict[str, Any])
def generate_schedule(request: ScheduleRequest, model_bundle = Depends(get_ml_model)):
    """
    Generate a smart study schedule using the ML model.
    """
    subjects_list = [s.name for s in request.subjects]
    difficulty_dict = {s.name: s.difficulty for s in request.subjects}
    score_dict = {s.name: s.past_score for s in request.subjects}
    
    # Build inputs for the model
    try:
        subject_features = build_subject_inputs(
            subjects=subjects_list,
            difficulty_by_subject=difficulty_dict,
            score_by_subject=score_dict,
            days_left=request.days_left
        )
        
        # Allocate hours using the best trained model
        allocated_hours = allocate_study_hours(
            model=model_bundle.best_model,
            subject_inputs=subject_features,
            total_hours=request.total_hours_per_day
        )
        
        # Format the output
        result = []
        for idx, row in subject_features.iterrows():
            subj_name = row['Subject']
            hours = allocated_hours[idx]
            result.append({
                "subject": subj_name,
                "allocated_hours": float(hours),
                "priority": row['Priority']
            })
            
        return {
            "schedule": result,
            "model_used": model_bundle.best_model_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
