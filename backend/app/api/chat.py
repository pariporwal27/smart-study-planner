from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import random
import os
import json
import urllib.request
import urllib.error
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.subject import Subject
from app.models.task import Task

router = APIRouter()

# Premium manual .env loader for maximum robustness
def load_dotenv():
    try:
        paths = ["backend/.env", ".env", "../.env", "app/.env"]
        for p in paths:
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")
                break
    except Exception:
        pass

load_dotenv()

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

def call_gemini_api(prompt: str, api_key: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1200
        }
    }
    
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            candidates = res_data.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                if parts:
                    return parts[0].get("text", "")
            return "I received an empty response from my Gemini AI engine. Please try asking again."
    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode("utf-8")
            error_json = json.loads(error_body)
            error_msg = error_json.get("error", {}).get("message", str(e))
            return f"Gemini API Error: {error_msg}"
        except Exception:
            return f"Gemini API HTTP Error {e.code}: {e.reason}"
    except Exception as e:
        return f"Failed to connect to Gemini API: {str(e)}"

def generate_study_assistant_fallback(msg: str, subj: str, db: Session = None) -> dict:
    m = msg.lower().strip()

    # 0. Syllabus / Subjects database-aware check
    if "syllabus" in m or "subject" in m or "chapter" in m or "topic" in m or "course" in m or "study load" in m:
        if db:
            subjects = db.query(Subject).filter(Subject.user_id == 1).all()
            if subjects:
                reply = "📚 **Here is your current Study Syllabus and Course Outline:**\n\n"
                for s in subjects:
                    reply += f"🔹 **{s.name}** (Difficulty: {s.difficulty_level}/5 | Target: {s.target_weekly_hours} hrs/week)\n"
                    # Fetch tasks for this subject
                    tasks = db.query(Task).filter(Task.subject_id == s.id).all()
                    if tasks:
                        reply += "   *Tasks/Modules:*\n"
                        for t in tasks:
                            status_emoji = "✅ Completed" if t.completed else "⏳ In Progress"
                            reply += f"   - {t.title} ({status_emoji})\n"
                    else:
                        reply += "   *No specific tasks or revision modules added yet for this subject.*\n"
                    reply += "\n"
                reply += "Would you like me to recommend a tailored active recall schedule or suggest customized resources for any of these subjects?"
                return {
                    "reply": reply,
                    "suggested_action": "Check Daily Plan"
                }
            else:
                return {
                    "reply": "You haven't added any subjects to your study planner yet! Go to your Dashboard's **Daily Plan** or **Weekly Planner** tabs to add subjects (e.g. Mathematics, Physics, Biology) and start tracking your syllabus.",
                    "suggested_action": "Check Daily Plan"
                }
        else:
            return {
                "reply": "To see your active syllabus, make sure the database connection is running. Generally, your syllabus consists of all registered subjects (e.g. Mathematics, Physics, Chemistry) and their associated milestones.",
                "suggested_action": "Check Daily Plan"
            }
    
    # 0.5 Dynamic Database Subject-Specific Match
    if db:
        try:
            subjects = db.query(Subject).filter(Subject.user_id == 1).all()
            for s in subjects:
                if s.name.lower() in m:
                    # Found the subject in user's timetable/subjects! Let's generate tailored advice
                    reply = f"🤖 **Study Assistant Insights for '{s.name}':**\n\n"
                    reply += f"I see **{s.name}** is on your study plan with a difficulty rating of **{s.difficulty_level}/5** and a target of **{s.target_weekly_hours} hours per week**.\n\n"
                    
                    s_lower = s.name.lower()
                    if "machine learning" in s_lower or "ml" in s_lower or "data science" in s_lower or "artificial intelligence" in s_lower or "ai" in s_lower:
                        reply += "💡 **ML Study Strategy:**\n" \
                                 "- **Understand the Math First**: Don't treat algorithms (like gradient descent or SVMs) as black boxes. Make sure to review the underlying linear algebra and calculus.\n" \
                                 "- **Hands-On Projects**: Implement algorithms from scratch or build a small end-to-end model on a dataset from Kaggle to solidify your theory.\n" \
                                 "- **Active Recall**: Test your understanding of model bias/variance, overfitting prevention (regularization), and evaluation metrics (precision, recall, F1-score)."
                    elif "computer science" in s_lower or "coding" in s_lower or "programming" in s_lower or "software" in s_lower or "web dev" in s_lower or "python" in s_lower or "javascript" in s_lower:
                        reply += "💻 **Programming / CS Strategy:**\n" \
                                 "- **Active Coding**: Write code daily! Reading a tutorial is passive; writing code, debugging errors, and refactoring builds real skill.\n" \
                                 "- **Deconstruct Algorithms**: Draw control flow charts and manually trace loops and variables for complex logic.\n" \
                                 "- **Zen Focus**: Minimize distractions during coding sessions. Setup a Pomodoro session for deep code reviews."
                    else:
                        reply += f"📚 **Active Recall Plan for {s.name}:**\n" \
                                 f"- **Feynman Explanation**: Try teaching the main concept of {s.name} you studied today to someone else in under 2 minutes.\n" \
                                 f"- **Q&A Flashcards**: Create 3 direct question-and-answer pairs for the most complex topic in this course.\n" \
                                 f"- **Spaced Reviews**: Review this subject every 3 days to flatten the forgetting curve."
                    
                    # Check for incomplete tasks
                    tasks = db.query(Task).filter(Task.subject_id == s.id, Task.completed == False).all()
                    if tasks:
                        reply += f"\n\n📝 **Your Next Tasks for {s.name}:**\n"
                        for t in tasks[:3]:
                            reply += f"- {t.title}\n"
                    
                    return {
                        "reply": reply,
                        "suggested_action": "Check Daily Plan"
                    }
        except Exception:
            pass

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

    # 2.6 Computer Science & Machine Learning Static Checks
    if "machine learning" in m or "ml" in m or "data science" in m or "artificial intelligence" in m or "ai" in m:
        return {
            "reply": "Machine Learning and AI connect mathematical theory with algorithmic execution!\n- **Linear Algebra & Calculus**: Grasp core concepts of gradient descent, matrix multiplication, and partial derivatives rather than treating libraries (scikit-learn, PyTorch) as black boxes.\n- **Hands-On Prototyping**: Build end-to-end projects. Fetch a dataset, perform EDA (Exploratory Data Analysis), clean features, train models, and tune hyperparameters.\n- **Conceptual Flashcards**: Write down differences between bias/variance, L1/L2 regularization, and evaluation metrics (ROC-AUC, F1-score) to test yourself using active recall.",
            "suggested_action": "Explain Gradient Descent"
        }
    if "computer science" in m or "coding" in m or "programming" in m or "software" in m or "javascript" in m or "python" in m or "development" in m:
        return {
            "reply": "Computer Science and Coding are highly active disciplines!\n- **Write Code Daily**: Passive reading does not build muscle memory. Write clean code, face debugging errors, and solve challenges on LeetCode or personal projects.\n- **Trace Logic Manually**: When learning an algorithm or data structure (e.g., binary search, recursion), trace the variables line-by-line on paper first.\n- **Spaced Practice**: Spend 30 minutes solving coding problems everyday rather than an 8-hour marathon once a week.",
            "suggested_action": "Start coding practice"
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

def generate_study_assistant_reply(msg: str, subj: str, db: Session = None) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        fallback_res = generate_study_assistant_fallback(msg, subj, db)
        return {
            "reply": (
                "⚠️ **General AI Knowledge is currently in Demo mode.**\n\n"
                "To unlock the superpowered AI Assistant capable of answering **any academic question of any difficulty** from any subject, "
                "simply add your free `GEMINI_API_KEY` to the `backend/.env` file!\n\n"
                "👉 **How to get your free key:**\n"
                "1. Go to [Google AI Studio](https://aistudio.google.com/)\n"
                "2. Click **Create API Key** and copy it.\n"
                "3. Create a file named `.env` in the `backend/` directory and add: `GEMINI_API_KEY=your_key_here`\n\n"
                "--- \n\n"
                f"🤖 **Local Study Assistant reply:**\n\n{fallback_res['reply']}"
            ),
            "suggested_action": fallback_res.get("suggested_action")
        }

    # Query active syllabus context to feed to Gemini
    subject_context = ""
    if db:
        try:
            subjects = db.query(Subject).filter(Subject.user_id == 1).all()
            for s in subjects:
                if s.name.lower() in msg.lower():
                    subject_context = f"Subject: {s.name} (Difficulty Level: {s.difficulty_level}/5, Weekly Target: {s.target_weekly_hours} hours)"
                    break
        except Exception:
            pass

    system_prompt = (
        "You are an Elite AI Study Assistant inside the Smart Study Planner application. "
        "Your mission is to provide deep, rigorous, and extremely detailed explanations to any question, regardless of subject or difficulty level. "
        "Whether the student asks about advanced mathematics, quantum physics, organic chemistry, machine learning, data structures, history, or literature, "
        "always answer with expert-level academic knowledge.\n\n"
        "Please follow these guidelines in your responses:\n"
        "1. Start your response with a friendly, high-energy academic opening.\n"
        "2. Format your response beautifully using clean Markdown: use **bold** to emphasize important technical terms, bullet points for lists, "
        "and clear headers where appropriate.\n"
        "3. Provide step-by-step reasoning or derivations for mathematical, scientific, or technical questions.\n"
        "4. Integrate pedagogical concepts (e.g., active recall questions, Feynman analogies, or spaced study tips) to help the student master the topic.\n"
        "5. Keep the tone highly motivational, professional, and intellectually stimulating.\n"
    )

    if subject_context:
        system_prompt += f"\nNote: The student is currently studying the subject '{subject_context}'. Relate your explanation to this context if helpful.\n"

    full_prompt = f"{system_prompt}\n\nStudent's Question: {msg}\n\nDetailed Explanation:"
    
    reply = call_gemini_api(full_prompt, api_key)
    
    return {
        "reply": reply,
        "suggested_action": None
    }

@router.post("/", response_model=ChatResponse)
def get_chat_response(request: ChatRequest, db: Session = Depends(get_db)):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    res = generate_study_assistant_reply(request.message, request.subject, db=db)
    return ChatResponse(
        reply=res["reply"],
        suggested_action=res.get("suggested_action")
    )
