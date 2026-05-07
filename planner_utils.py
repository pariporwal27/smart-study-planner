"""Helper functions for Smart Study Planner."""

from __future__ import annotations

from datetime import date, timedelta
import json
from pathlib import Path

import pandas as pd


PROGRESS_COLUMNS = ["date", "subject", "planned_hours", "actual_hours"]
BASE_DIR = Path(__file__).resolve().parent
SETTINGS_FILE = BASE_DIR / "data" / "settings.json"


def format_hours(decimal_hours: float) -> str:
    """Convert decimal hours to 'Xh Ym' format."""
    h = int(decimal_hours)
    m = int(round((decimal_hours - h) * 60))
    if m == 60:
        h += 1
        m = 0
    if h > 0 and m > 0:
        return f"{h}h {m}m"
    if h > 0:
        return f"{h}h"
    return f"{m}m"


def parse_subjects(subject_text: str) -> list[str]:
    """Convert a comma-separated subject string into a clean subject list."""
    subjects = [subject.strip() for subject in subject_text.split(",")]
    return [subject for subject in subjects if subject]


def calculate_priority(
    difficulty: int,
    past_score: int,
    days_left: int,
    allocated_hours: float,
    average_hours: float,
) -> str:
    """Assign a simple High/Medium/Low priority label."""
    urgency_score = (difficulty * 1.5) + ((100 - past_score) / 15) + (20 / max(days_left, 1))

    if urgency_score >= 10 or allocated_hours >= average_hours * 1.2:
        return "High"
    if urgency_score >= 6 or allocated_hours >= average_hours * 0.85:
        return "Medium"
    return "Low"


def build_subject_inputs(
    subjects: list[str],
    difficulty_by_subject: dict[str, int],
    score_by_subject: dict[str, int],
    days_left: int,
) -> list[dict]:
    """Create model-ready rows from Streamlit form inputs."""
    return [
        {
            "subject": subject,
            "difficulty": difficulty_by_subject[subject],
            "past_score": score_by_subject[subject],
            "days_left": days_left,
        }
        for subject in subjects
    ]


def create_results_table(
    subject_inputs: list[dict],
    allocated_hours: list[float],
) -> pd.DataFrame:
    """Build the final result table shown in the app."""
    average_hours = sum(allocated_hours) / len(allocated_hours)
    rows = []

    for item, hours in zip(subject_inputs, allocated_hours):
        rows.append(
            {
                "Subject": item["subject"],
                "Difficulty": item["difficulty"],
                "Past Score": item["past_score"],
                "Days Left": item["days_left"],
                "Study Hours": round(float(hours), 2),
                "Priority": calculate_priority(
                    difficulty=item["difficulty"],
                    past_score=item["past_score"],
                    days_left=item["days_left"],
                    allocated_hours=float(hours),
                    average_hours=average_hours,
                ),
            }
        )

    return pd.DataFrame(rows).sort_values(
        ["Priority", "Study Hours"],
        ascending=[True, False],
        key=lambda column: column.map({"High": 0, "Medium": 1, "Low": 2})
        if column.name == "Priority"
        else column,
    )


def generate_suggestions(results: pd.DataFrame) -> list[dict]:
    """Create explainable study suggestions with subject-specific reasons."""
    suggestions = []
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    ranked = results.sort_values(
        ["Priority", "Past Score", "Days Left"],
        ascending=[True, True, True],
        key=lambda column: column.map(priority_order) if column.name == "Priority" else column,
    )

    for _, row in ranked.head(3).iterrows():
        reasons = []
        if row["Past Score"] < 55:
            reasons.append(f"Score is low ({int(row['Past Score'])})")
        if row["Difficulty"] >= 4:
            reasons.append(f"Difficulty is high ({int(row['Difficulty'])})")
        if row["Days Left"] <= 10:
            reasons.append(f"Exam is near ({int(row['Days Left'])} days left)")

        if reasons:
            suggestions.append(
                {
                    "subject": row["Subject"],
                    "message": f"{row['Subject']} needs more focus because:",
                    "reasons": reasons,
                }
            )

    if not suggestions:
        top_subject = results.sort_values("Study Hours", ascending=False).iloc[0]
        suggestions.append(
            {
                "subject": top_subject["Subject"],
                "message": f"Keep {top_subject['Subject']} as your main focus today because:",
                "reasons": [
                    f"It has the highest planned study time ({top_subject['Study Hours']:.2f} hours)"
                ],
            }
        )

    return suggestions


def ensure_progress_file(path: str | Path | None = None) -> Path:
    """Create progress storage with headers if it does not already exist."""
    if path is None:
        path = BASE_DIR / "data" / "progress.csv"
    progress_path = Path(path)
    progress_path.parent.mkdir(parents=True, exist_ok=True)

    if not progress_path.exists():
        pd.DataFrame(columns=PROGRESS_COLUMNS).to_csv(progress_path, index=False)

    return progress_path


def load_progress(path: str | Path | None = None) -> pd.DataFrame:
    """Load logged progress from CSV storage."""
    progress_path = ensure_progress_file(path)
    progress = pd.read_csv(progress_path)

    if progress.empty:
        return pd.DataFrame(columns=PROGRESS_COLUMNS)

    progress["date"] = pd.to_datetime(progress["date"]).dt.date
    progress["planned_hours"] = pd.to_numeric(progress["planned_hours"], errors="coerce").fillna(0)
    progress["actual_hours"] = pd.to_numeric(progress["actual_hours"], errors="coerce").fillna(0)
    return progress


def save_progress(
    results: pd.DataFrame,
    actual_hours_by_subject: dict[str, float],
    progress_date: date,
    path: str | Path | None = None,
) -> None:
    """Append or replace one day's progress rows for the current subjects."""
    existing_progress = load_progress(path)
    current_subjects = set(results["Subject"])

    if not existing_progress.empty:
        duplicate_rows = (existing_progress["date"] == progress_date) & (
            existing_progress["subject"].isin(current_subjects)
        )
        existing_progress = existing_progress.loc[~duplicate_rows]

    new_rows = []
    for _, row in results.iterrows():
        subject = row["Subject"]
        new_rows.append(
            {
                "date": progress_date.isoformat(),
                "subject": subject,
                "planned_hours": round(float(row["Study Hours"]), 2),
                "actual_hours": round(float(actual_hours_by_subject.get(subject, 0)), 2),
            }
        )

    combined_progress = pd.concat(
        [existing_progress, pd.DataFrame(new_rows)],
        ignore_index=True,
    )
    combined_progress.to_csv(ensure_progress_file(path), index=False)


def calculate_consistency(progress: pd.DataFrame) -> float:
    """Calculate displayed consistency capped at 100 percent."""
    if progress.empty or progress["planned_hours"].sum() <= 0:
        return 0.0

    raw_consistency = progress["actual_hours"].sum() / progress["planned_hours"].sum() * 100
    consistency = min(raw_consistency, 100)
    return round(float(consistency), 1)


def get_consistency_details(progress: pd.DataFrame) -> dict:
    """Return capped consistency plus status, including overwork detection."""
    if progress.empty or progress["planned_hours"].sum() <= 0:
        return {
            "percentage": 0.0,
            "raw_percentage": 0.0,
            "status": "Needs Improvement",
            "is_overworked": False,
        }

    planned = float(progress["planned_hours"].sum())
    actual = float(progress["actual_hours"].sum())
    raw_percentage = actual / planned * 100
    is_overworked = actual > planned

    return {
        "percentage": round(min(raw_percentage, 100), 1),
        "raw_percentage": round(raw_percentage, 1),
        "status": get_consistency_badge(min(raw_percentage, 100), is_overworked),
        "is_overworked": is_overworked,
    }


def get_consistency_badge(consistency: float, is_overworked: bool = False) -> str:
    """Convert consistency percentage and overwork state to a status badge."""
    if is_overworked:
        return "Overworked"
    if consistency >= 80:
        return "Highly Consistent"
    if consistency >= 50:
        return "Moderately Consistent"
    return "Needs Improvement"


def calculate_daily_streak(progress: pd.DataFrame, today: date | None = None) -> int:
    """Count consecutive logged days ending today or yesterday."""
    if progress.empty:
        return 0

    today = today or date.today()
    logged_dates = set(pd.to_datetime(progress["date"]).dt.date)
    cursor = today if today in logged_dates else today - timedelta(days=1)
    streak = 0

    while cursor in logged_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


def build_progress_summary(progress: pd.DataFrame) -> pd.DataFrame:
    """Aggregate progress by date for planned vs actual line charts."""
    if progress.empty:
        return pd.DataFrame(columns=["date", "Planned Hours", "Actual Hours"])

    progress = progress.copy()
    progress["date"] = pd.to_datetime(progress["date"])
    summary = (
        progress.groupby("date", as_index=False)[["planned_hours", "actual_hours"]]
        .sum()
        .sort_values("date")
    )
    return summary.rename(
        columns={
            "planned_hours": "Planned Hours",
            "actual_hours": "Actual Hours",
        }
    )


def generate_weekly_plan(
    results: pd.DataFrame,
    daily_hours: float,
    variation: int = 0,
    start_date: date | None = None,
) -> pd.DataFrame:
    """Create a rolling 7-day plan with harder subjects earlier in the week."""
    if start_date is None:
        start_date = date.today()

    day_multipliers = {
        "Monday": 1.15,
        "Tuesday": 1.1,
        "Wednesday": 1.0,
        "Thursday": 1.0,
        "Friday": 0.95,
        "Saturday": 0.75,
        "Sunday": 0.65,
    }
    hard_subject_days = {"Monday", "Tuesday", "Wednesday"}
    total_weekly_hours = daily_hours * 7
    multiplier_total = sum(day_multipliers.values())
    plan_rows = []
    variation_factor = (variation % 5) * 0.03

    subjects = results.copy()
    subjects["urgency"] = (
        subjects["Difficulty"] * 1.8
        + (100 - subjects["Past Score"]) / 12
        + 20 / subjects["Days Left"].clip(lower=1)
    )

    for i in range(7):
        current_date = start_date + timedelta(days=i)
        weekday_name = current_date.strftime("%A")
        # Format the day label for the UI (e.g., "Thu, 07 May")
        day_label = current_date.strftime("%a, %d %b")
        
        # Redistribute weekly budget but ensure we never exceed the user's daily limit
        multiplier = day_multipliers.get(weekday_name, 1.0)
        day_total = (total_weekly_hours * multiplier) / multiplier_total
        day_total = min(day_total, daily_hours)
        
        weighted_subjects = subjects.copy()
        weighted_subjects["day_weight"] = weighted_subjects["urgency"]

        # Put harder subjects earlier, and leave weekends lighter with more review.
        if weekday_name in hard_subject_days:
            weighted_subjects["day_weight"] += weighted_subjects["Difficulty"] * 0.8
        else:
            weighted_subjects["day_weight"] += (100 - weighted_subjects["Past Score"]) / 25

        revision_share = 0.15 if weekday_name in hard_subject_days else 0.28
        revision_share = min(revision_share + variation_factor, 0.35)
        subject_time = day_total * (1 - revision_share)
        weight_total = weighted_subjects["day_weight"].sum()

        for _, row in weighted_subjects.sort_values("day_weight", ascending=False).iterrows():
            hours = subject_time * row["day_weight"] / weight_total
            if hours >= 0.2:
                plan_rows.append(
                    {
                        "Day": day_label,
                        "Date": current_date, # Keep raw date for sorting if needed
                        "Subject": row["Subject"],
                        "Session Type": "Deep Study" if row["Difficulty"] >= 4 else "Practice",
                        "Hours": round(float(hours), 2),
                    }
                )

        revision_subject = weighted_subjects.sort_values(
            ["Past Score", "Difficulty"], ascending=[True, False]
        ).iloc[0]["Subject"]
        plan_rows.append(
            {
                "Day": day_label,
                "Date": current_date,
                "Subject": revision_subject,
                "Session Type": "Revision",
                "Hours": round(float(day_total * revision_share), 2),
            }
        )

    return pd.DataFrame(plan_rows)


def summarize_weekly_plan(weekly_plan: pd.DataFrame) -> pd.DataFrame:
    """Aggregate weekly plan rows by day for a compact daily breakdown."""
    if weekly_plan.empty:
        return pd.DataFrame(columns=["Day", "Total Hours"])

    # Group by Day and Date to maintain the link for sorting
    summary = weekly_plan.groupby(["Day", "Date"], as_index=False)["Hours"].sum()
    summary = summary.sort_values("Date")
    return summary.rename(columns={"Hours": "Total Hours"})


def get_productive_day_metrics(progress: pd.DataFrame) -> dict:
    """Find the strongest and weakest logged study days."""
    summary = build_progress_summary(progress)
    if summary.empty:
        return {"most_productive": "No data", "least_productive": "No data"}

    most = summary.loc[summary["Actual Hours"].idxmax()]
    least = summary.loc[summary["Actual Hours"].idxmin()]
    return {
        "most_productive": f"{most['date'].date()} ({most['Actual Hours']:.2f} hours)",
        "least_productive": f"{least['date'].date()} ({least['Actual Hours']:.2f} hours)",
    }


def classify_productivity_persona(
    progress: pd.DataFrame,
    consistency_details: dict,
    days_left: int,
) -> dict:
    """Classify user behavior into a simple productivity persona."""
    if progress.empty:
        return {
            "persona": "Casual Learner",
            "description": "You are just starting to log your study behavior.",
            "advice": "Save progress for a few days to unlock a more accurate persona.",
        }

    summary = build_progress_summary(progress)
    average_actual = float(summary["Actual Hours"].mean())
    max_actual = float(summary["Actual Hours"].max())
    logged_days = len(summary)
    consistency = consistency_details["percentage"]

    if consistency_details["is_overworked"] or max_actual > 8 or average_actual > 7:
        return {
            "persona": "Burnout Risk",
            "description": "You are studying more than the plan or stacking very long days.",
            "advice": "Use 50 minute focus blocks, add breaks, and keep at least one lighter recovery day.",
        }
    if days_left <= 10 and average_actual >= 5 and logged_days <= 3:
        return {
            "persona": "Last-Minute Grinder",
            "description": "Your study intensity is high close to the exam.",
            "advice": "Prioritize weak topics first and reserve the final day for revision instead of new material.",
        }
    if consistency >= 80 and average_actual <= 6:
        return {
            "persona": "Consistent Learner",
            "description": "Your study habits are stable and disciplined.",
            "advice": "Keep the routine steady and use weekly review sessions to protect long-term retention.",
        }
    if average_actual >= 4 and logged_days >= 3:
        return {
            "persona": "Deep Focus Student",
            "description": "You regularly put in focused study time.",
            "advice": "Track topic-level outcomes so your long sessions stay purposeful.",
        }
    return {
        "persona": "Casual Learner",
        "description": "Your study pattern is still light or irregular.",
        "advice": "Start with small daily targets and build a streak before increasing total hours.",
    }

def load_user_settings(path: str = SETTINGS_FILE) -> dict:
    """Load user preferences from JSON storage."""
    settings_path = Path(path)
    if not settings_path.exists():
        return {}
    try:
        with open(settings_path, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_user_settings(settings: dict, path: str = SETTINGS_FILE) -> None:
    """Write user preferences to JSON storage."""
    settings_path = Path(path)
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=4)
