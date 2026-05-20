from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    subject: str = "general"

class ChatResponse(BaseModel):
    reply: str
    suggested_action: str = None

STUDY_TIPS = [
  "Have you tried the Feynman Technique? Teach the concept to an imaginary student in plain language.",
  "Consider spacing out your math practice. Doing 3 questions daily is better than 21 questions in one night.",
  "Take a 5-minute screen-free break now to let your brain consolidate what you just learned.",
  "For physics problems, always list your known variables first before picking an equation."
]

def generate_study_assistant_reply(msg: str, subj: str) -> dict:
    m = msg.lower()
    subj = subj.lower()
    
    if "help" in m or "how to" in m:
        return {
            "reply": "I can help you construct flashcards, explain concepts simply, schedule dynamic study blocks, or suggest active recall questions. What subject are you working on right now?",
            "suggested_action": "Explain a topic to me"
        }
    
    if "revision" in m or "revise" in m:
        return {
            "reply": "For effective revision, try Spaced Repetition! Review your topic today, then in 3 days, then 7 days. I've automatically added this to your Revision Planner tab!",
            "suggested_action": "Check Revision Planner"
        }
        
    if "burnout" in m or "tired" in m or "exhausted" in m:
        return {
            "reply": "It sounds like you might be studying at a very high intensity. I suggest using Zen Mode to set a shorter 25-minute Pomodoro timer followed by a mandatory 5-minute screen-free break.",
            "suggested_action": "Start Zen Session"
        }
        
    # Subject-specific replies
    if "math" in subj or "math" in m:
        return {
            "reply": "Math requires active problem-solving! Try working through active derivation exercises rather than just reading explanations. Would you like me to suggest a sample practice plan?",
            "suggested_action": "Generate Math Plan"
        }
    if "physics" in subj or "physics" in m:
        return {
            "reply": "Physics is all about conceptual understanding. Make sure you map standard force diagrams before calculating equations. Let me know if you want a step-by-step breakdown.",
            "suggested_action": "Break down a formula"
        }
        
    # General fallback
    tip = random.choice(STUDY_TIPS)
    return {
        "reply": f"That's a great question. Remember: {tip} Tell me more about what specific concept or homework problem you are tackling right now so I can break it down step-by-step!",
        "suggested_action": "Solve practice problem"
    }

@router.post("/", response_model=ChatResponse)
def get_chat_response(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    res = generate_study_assistant_reply(request.message, request.subject)
    return ChatResponse(
        reply=res["reply"],
        suggested_action=res.get("suggested_action")
    )
