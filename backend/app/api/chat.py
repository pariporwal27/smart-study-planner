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
    m = msg.lower().strip()
    
    # 1. Study Methods & Learning Techniques
    if "feynman" in m:
        return {
            "reply": "The Feynman Technique is a mental model for rapid learning:\n1. Choose a concept you want to understand.\n2. Explain it in simple terms as if teaching it to a 10-year-old child.\n3. Identify gaps in your explanation, then return to the source material to fill them.\n4. Simplify your analogy and language further until it flows naturally.",
            "suggested_action": "Try explaining Physics"
        }
    if "recall" in m or "active recall" in m:
        return {
            "reply": "Active Recall is the single most effective study method! Instead of passively re-reading notes or highlighting:\n- Close the book and write down everything you remember.\n- Create high-quality flashcards with direct question-and-answer pairs.\n- Test yourself frequently before reviewing the answers.",
            "suggested_action": "Start Active Recall Test"
        }
    if "pomodoro" in m or "focus" in m:
        return {
            "reply": "The Pomodoro Technique is excellent for focus:\n1. Choose a high-priority task.\n2. Set a timer for 25 minutes (Zen focus session).\n3. Work single-mindedly until the timer rings.\n4. Take a mandatory 5-minute offline break.\n5. Repeat 4 times, then take a longer 20-minute break.",
            "suggested_action": "Open Zen Timer"
        }
    if "spaced" in m or "repetition" in m or "leitner" in m:
        return {
            "reply": "Spaced Repetition exploits the psychological forgetting curve! By spacing reviews at intervals (e.g., Day 1, Day 3, Day 7, Day 14), you trigger active recall just as the memory begins to fade, moving facts from short-term into permanent long-term memory.",
            "suggested_action": "Open Revision Planner"
        }

    # 2. Subject-Specific Detailed Explanations
    if "math" in m or "calculus" in m or "algebra" in m:
        return {
            "reply": "Mathematics is about structural patterns. Here is my active formula to master Math:\n- **Conceptualize**: Understand *why* a formula works instead of memorizing it.\n- **Derive**: Try writing out the steps to prove a formula.\n- **Spaced Practice**: Solve 3-5 high-difficulty questions daily rather than cramming before test dates.",
            "suggested_action": "Solve Math problems"
        }
    if "physics" in m or "mechanics" in m:
        return {
            "reply": "Physics connects mathematical equations to real-world observables! \n- **Always draw force diagrams**: High-priority for mechanics and kinetics problems.\n- **Define your variables**: List mass (m), velocity (v), acceleration (a), and forces (F) clearly before plugging into formulas.",
            "suggested_action": "Review Physics notes"
        }
    if "chemistry" in m or "organic" in m:
        return {
            "reply": "Chemistry bridges molecular physics and macroscopic biology!\n- **Organic Chemistry**: Focus on understanding electron density flows and curved-arrow reaction mechanisms rather than sheer memorization.\n- **Periodic trends**: Memorize electronegativity, atomic radius, and ionization energy trends to predict properties instantly.",
            "suggested_action": "Review periodic trends"
        }
    if "biology" in m or "photosynthesis" in m or "genetics" in m:
        return {
            "reply": "Biology relies heavily on complex cellular pathways and classification systems.\n- **Draw diagrams**: Label cell organelles, DNA replication forks, or Krebs cycle stages from scratch.\n- **Feynman explanation**: Describe photosynthesis as if explaining how a plant makes its own kitchen recipes to a child.",
            "suggested_action": "Draw cellular diagrams"
        }
    if "history" in m or "world war" in m:
        return {
            "reply": "History is a series of interconnected cause-and-effect networks, not just a list of dry dates!\n- **Chronological timelines**: Map core social, economic, and political drivers leading to key turning points.\n- **Theme mapping**: Match historic figures to their underlying ideological values.",
            "suggested_action": "Build History timeline"
        }

    # 3. Motivation, Schedule, Exam Pressure, and Burnout
    if "burnout" in m or "tired" in m or "exhausted" in m:
        return {
            "reply": "Exhaustion is a sign that your study sessions lack adequate restorative breaks. \n- **Immediate action**: Shut down your laptop, step away from screens, and take a 10-minute walk or practice mindfulness.\n- **Long-term**: Reduce your daily study hour targets to a sustainable level in your Daily Plan dashboard.",
            "suggested_action": "Lower daily hours"
        }
    if "motivation" in m or "lazy" in m or "start" in m:
        return {
            "reply": "Action precedes motivation, not the other way around! Don't wait to 'feel like studying.' Instead:\n- Use the **5-Minute Rule**: Tell yourself you will study for exactly 5 minutes. If you want to stop then, you can. (90% of the time, you will keep going!).\n- Start a short 25-minute Pomodoro timer inside our Zen Mode tab.",
            "suggested_action": "Start 25m focus"
        }
    if "anxiety" in m or "exam" in m or "stress" in m:
        return {
            "reply": "Exam anxiety is extremely common but highly manageable:\n- **Practice under mock exam conditions**: Set a timer and solve practice questions without your notes.\n- **Focus on effort, not outcomes**: You cannot control the exact test grade, but you *can* control how many high-focus study sessions you log today.",
            "suggested_action": "Start practice test"
        }
    if "schedule" in m or "plan" in m or "allocate" in m:
        return {
            "reply": "Your AI Schedule is automatically calculated in the **Daily Plan** tab using ML regressions! It analyzes your past performance and study levels to balance daily hour targets so you never burn out.",
            "suggested_action": "Check Daily Plan"
        }

    # General fallback response with rich tips
    tip = random.choice(STUDY_TIPS)
    return {
        "reply": f"I'm here to support your study goals! Remember: {tip}\n\nAsk me how to use the 'Feynman Technique', tips on 'Active Recall', advice on 'burnout', or ask about specific subjects like 'Math' or 'Physics' to get customized study frameworks!",
        "suggested_action": "Learn study methods"
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
