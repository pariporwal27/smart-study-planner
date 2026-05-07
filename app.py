"""Streamlit dashboard for Smart Study Planner."""

from __future__ import annotations

from datetime import date, timedelta
import time

import matplotlib.pyplot as plt
import pandas as pd
import base64
from streamlit.components.v1 import html as components_html
from typing import Optional
import plotly.express as px
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Rectangle
from pathlib import Path
import streamlit as st

from model import (
    allocate_study_hours,
    get_random_forest_feature_importance,
    load_training_data,
    train_models,
)
from planner_utils import (
    build_subject_inputs,
    build_progress_summary,
    calculate_daily_streak,
    classify_productivity_persona,
    create_results_table,
    format_hours,
    generate_suggestions,
    generate_weekly_plan,
    ensure_progress_file,
    PROGRESS_COLUMNS,
    get_consistency_details,
    get_productive_day_metrics,
    load_progress,
    parse_subjects,
    save_progress,
    summarize_weekly_plan,
    load_user_settings,
    save_user_settings,
)


st.set_page_config(
    page_title="Smart Study Planner",
    page_icon=":material/school:",
    layout="wide",
    initial_sidebar_state="expanded",
)


st.markdown(
    """
    <style>
    .block-container {
        padding-top: 1rem;
        padding-bottom: 1.5rem;
        max-width: 980px; /* tightened to reduce large horizontal gaps */
    }
    .stMetric {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 0.85rem;
    }
    div[data-testid="stExpander"] {
        border-radius: 8px;
    }
    .persona-card {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        padding: 1rem;
        background: rgba(255,255,255,0.04);
    }
    .timer-display {
        font-size: 3rem;
        font-weight: 700;
        letter-spacing: 0;
        text-align: center;
        margin: 0.5rem 0 1rem;
    }
    @media (max-width: 760px) {
        .timer-display { font-size: 2.25rem; }
        .block-container { padding-left: 0.8rem; padding-right: 0.8rem; }
    }
    /* Stronger, more visible tab styles */
    /* Targets Streamlit's tab buttons; selectors are intentionally specific */
    section.stTabs > div > div[role="tablist"] button[role="tab"] {
        font-size: 1.02rem;
        font-weight: 700;
        padding: 0.55rem 1rem;
        margin-right: 0.45rem;
        border-radius: 10px;
        background: rgba(255,255,255,0.02);
        color: #e6eef8;
        border: 1px solid rgba(255,255,255,0.04);
        transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
    }
    section.stTabs > div > div[role="tablist"] button[role="tab"][aria-selected="true"] {
        background: linear-gradient(90deg, #4e79a7 0%, #59a14f 100%);
        color: #ffffff;
        box-shadow: 0 8px 22px rgba(78,121,167,0.16);
        transform: translateY(-3px);
        border: none;
    }
    section.stTabs > div > div[role="tablist"] button[role="tab"]:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(0,0,0,0.08);
    }
    /* Add extra spacing below the tabs so content reads clearly */
    section.stTabs { padding: 0.25rem 0.5rem; margin-bottom: 1rem; }
    div[data-testid="stHorizontalBlock"] { gap: 8px; }
    /* Reduce spacing between sidebar and main content on wide layouts */
    .stApp > .main > .block-container {
        padding-left: 1rem;
        padding-right: 1rem;
    }
    /* Make columns use available space more tightly */
    .stApp .element-container .row-widget.stColumns > div {
        gap: 8px;
    }
    /* Left-align the tab row so tabs start at the page/content start */
    section.stTabs > div > div[role="tablist"] {
        justify-content: flex-start !important;
        width: 100%;
        padding-left: 0; /* remove extra offset */
        margin-left: 0 !important;
    }
    /* Ensure the tab buttons align to the left edge of the content block */
    .block-container section.stTabs { padding-left: 0 !important; margin-left: 0 !important; }
    /* Remove any automatic centering wrapper Streamlit may add */
    .stApp .main .block-container > div:first-child { padding-left: 0 !important; margin-left: 0 !important; }
    /* Reduce left offset on tab buttons themselves */
    section.stTabs > div > div[role="tablist"] button[role="tab"] { margin-left: 0 !important; }
    /* Weekly planner card grid + gamification styles */
    .weekly-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: stretch;
    }
    .day-card {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        border-radius: 12px;
        padding: 12px;
        width: calc(33.333% - 12px);
        box-shadow: 0 6px 18px rgba(11,22,33,0.06);
        border: 1px solid rgba(255,255,255,0.04);
        color: #eaf3ff;
    }
    .day-card .day-name { font-weight:700; font-size:1.05rem; margin-bottom:6px; }
    .day-card .hours { font-size:1.4rem; font-weight:800; margin-bottom:6px; }
    .xp-bar { background: rgba(255,255,255,0.04); height: 12px; border-radius: 8px; overflow: hidden; }
    .xp-fill { height: 100%; background: linear-gradient(90deg,#f6b26b,#59a14f); }
    .big-card { width: calc(33.333% - 12px); display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding:16px; }
    @media (max-width: 900px) {
        .day-card, .big-card { width: calc(50% - 12px); }
    }
    @media (max-width: 560px) {
        .day-card, .big-card { width: 100%; }
    }
    /* Disable the default Streamlit "running" dimming/blur and status widget */
    [data-testid="stStatusWidget"] {
        display: none !important;
    }
    .stApp {
        filter: none !important;
    }
    div.stAppViewMain {
        opacity: 1 !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def get_training_data():
    """Cache dataset loading so the app stays responsive."""
    return load_training_data()


@st.cache_resource
def get_model_bundle():
    """Cache trained models between Streamlit reruns."""
    data = get_training_data()
    return train_models(data)


def plot_allocations(results):
    """Create a matplotlib bar chart for subject-wise study hours."""
    fig, ax = plt.subplots(figsize=(9, 4.8))
    colors = results["Priority"].map(
        {"High": "#e15759", "Medium": "#f28e2b", "Low": "#59a14f"}
    )

    ax.bar(results["Subject"], results["Study Hours"], color=colors)
    ax.set_ylabel("Daily Study Hours")
    ax.set_xlabel("Subject")
    ax.set_title("Recommended Daily Study Plan")
    ax.grid(axis="y", alpha=0.25)
    ax.tick_params(axis="x", rotation=0)
    fig.tight_layout()
    return fig


def plot_feature_importance(importance_frame):
    """Create a bar chart for Random Forest feature importance."""
    fig, ax = plt.subplots(figsize=(7, 3.8))
    ax.barh(importance_frame["Feature"], importance_frame["Importance"], color="#4e79a7")
    ax.invert_yaxis()
    ax.set_xlabel("Importance")
    ax.set_title("Random Forest Feature Importance")
    ax.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    return fig


def plot_progress(progress_summary):
    """Create a planned-vs-actual line chart from logged progress."""
    fig, ax = plt.subplots(figsize=(9, 4.4))
    ax.plot(
        progress_summary["date"],
        progress_summary["Planned Hours"],
        marker="o",
        linewidth=2.2,
        label="Planned",
        color="#4e79a7",
    )
    ax.plot(
        progress_summary["date"],
        progress_summary["Actual Hours"],
        marker="o",
        linewidth=2.2,
        label="Actual",
        color="#59a14f",
    )
    ax.set_ylabel("Hours")
    ax.set_xlabel("Date")
    ax.set_title("Planned vs Actual Study Hours")
    ax.grid(alpha=0.25)
    ax.legend()
    # Ensure x-axis dates are horizontal and centered
    for lbl in ax.get_xticklabels():
        lbl.set_rotation(0)
        lbl.set_ha("center")
    fig.tight_layout()
    return fig


def plot_heatmap(progress_summary):
    """Draw a GitHub-style calendar heatmap using daily actual hours."""
    if progress_summary.empty:
        return None

    summary = progress_summary.copy()
    summary["date"] = summary["date"].dt.date
    start_date = min(summary["date"].min(), date.today()) - timedelta(
        days=min(summary["date"].min(), date.today()).weekday()
    )
    end_date = max(summary["date"].max(), date.today())
    total_days = (end_date - start_date).days + 1
    week_count = (total_days // 7) + 1
    hours_by_date = dict(zip(summary["date"], summary["Actual Hours"]))
    max_hours = max(hours_by_date.values()) if hours_by_date else 1

    fig_width = max(8, week_count * 0.45)
    fig, ax = plt.subplots(figsize=(fig_width, 3.4))
    cmap = LinearSegmentedColormap.from_list(
        "study_productivity", ["#f4cccc", "#f6b26b", "#93c47d", "#38761d"]
    )

    for offset in range(total_days):
        current = start_date + timedelta(days=offset)
        week = offset // 7
        weekday = current.weekday()
        hours = float(hours_by_date.get(current, 0))
        intensity = 0 if max_hours <= 0 else min(hours / max_hours, 1)
        color = cmap(intensity)
        ax.add_patch(Rectangle((week, 6 - weekday), 0.85, 0.85, color=color))

    ax.set_xlim(-0.2, week_count)
    ax.set_ylim(-0.2, 7)
    ax.set_yticks(range(7))
    ax.set_yticklabels(["Sun", "Sat", "Fri", "Thu", "Wed", "Tue", "Mon"])
    ax.set_xticks(range(0, week_count, max(1, week_count // 6)))
    ax.set_xticklabels(
        [
            (start_date + timedelta(days=week * 7)).strftime("%d %b")
            for week in range(0, week_count, max(1, week_count // 6))
        ],
        rotation=0,
        ha="center",
    )
    ax.set_title("Study Heatmap Calendar")
    ax.set_xlabel("Week")
    ax.set_frame_on(False)
    ax.tick_params(length=0)
    fig.tight_layout()
    return fig


def persist_settings():
    """Save sidebar inputs and subject-specific details to disk."""
    # Note: We pull directly from session_state keys assigned to widgets
    to_save = {
        "subjects_text": st.session_state.get("subjects_text"),
        "days_left": st.session_state.get("days_left"),
        "total_hours": st.session_state.get("total_hours"),
    }
    # Capture dynamic subject sliders
    subjects = parse_subjects(st.session_state.get("subjects_text", ""))
    for s in subjects:
        d_key, s_key = f"{s}_difficulty", f"{s}_score"
        if d_key in st.session_state: to_save[d_key] = st.session_state[d_key]
        if s_key in st.session_state: to_save[s_key] = st.session_state[s_key]
    
    save_user_settings(to_save)
    
    # Sync with URL query parameters for refresh persistence
    try:
        # Convert all to strings for query params
        param_dict = {k: str(v) for k, v in to_save.items() if v is not None}
        st.query_params.update(param_dict)
    except Exception:
        pass


def initialize_focus_state():
    """Set default values for the Streamlit focus timer."""
    defaults = {
        "focus_mode": "Study",
        "focus_running": False,
        "focus_end_time": None,
        "focus_remaining": 50 * 60,
        "completed_sessions": 0,
    }
    for key, value in defaults.items():
        st.session_state.setdefault(key, value)


def format_seconds(seconds):
    """Format timer seconds as MM:SS."""
    minutes, seconds = divmod(max(int(seconds), 0), 60)
    return f"{minutes:02d}:{seconds:02d}"


def render_focus_mode():
    """Ultra-stable minimalist focus timer."""
    initialize_focus_state()
    
    # 1. PRESERVE ZEN STATE (Crucial for Streamlit Reruns)
    if st.session_state.get("zen_toggle"):
        st.session_state.zen_toggle = True
    
    is_zen = st.session_state.get("zen_toggle", False)
    
    # Aggressive CSS to kill all Streamlit artifacts
    if is_zen:
        st.markdown("""
            <style>
                /* Kill ALL Streamlit Chrome */
                header, [data-testid="stHeader"], .stAppHeader, [data-testid="stToolbar"], footer { display: none !important; visibility: hidden !important; }
                [data-testid="stSidebar"], [data-testid="stTabs"] { display: none !important; }
                .stApp > header { display: none !important; }
                
                /* The Trigger: A tiny, minimalist square piece */
                div[data-testid="stPopover"] { 
                    position: fixed !important; 
                    top: 6px !important; 
                    left: 6px !important; 
                    z-index: 99999999 !important; 
                }
                div[data-testid="stPopover"] > button { 
                    background: rgba(255,255,255,0.02) !important; 
                    backdrop-filter: blur(5px) !important;
                    border: 1px solid rgba(255,255,255,0.06) !important; 
                    border-radius: 2px !important;
                    width: 20px !important;
                    height: 20px !important;
                    min-height: 20px !important;
                    padding: 0 !important;
                    color: transparent !important;
                    box-shadow: none !important;
                }
                div[data-testid="stPopover"] > button:hover { 
                    background: rgba(255,255,255,0.1) !important;
                    border-color: rgba(255,255,255,0.4) !important;
                }
                div[data-testid="stPopover"] > button p { display: none !important; }
                div[data-testid="stPopoverContent"] { 
                    background: rgba(15, 23, 42, 0.8) !important; 
                    backdrop-filter: blur(40px) !important; 
                    border: 1px solid rgba(255,255,255,0.1) !important; 
                    border-radius: 12px !important;
                    min-width: 260px !important;
                    color: white !important;
                }
            </style>
        """, unsafe_allow_html=True)
    
    if "study_duration" not in st.session_state: st.session_state.study_duration = 50
    if "break_duration" not in st.session_state: st.session_state.break_duration = 10

    def update_durations():
        if not st.session_state.focus_running:
            if st.session_state.focus_mode == "Study":
                st.session_state.focus_remaining = st.session_state.study_duration * 60
            else:
                st.session_state.focus_remaining = st.session_state.break_duration * 60

    if is_zen:
        with st.popover("⚙️"):
            st.markdown("### Focus Settings")
            c1, c2, c3 = st.columns(3)
            if c1.button("▶", key="z_start"):
                st.session_state.focus_running = True
                st.session_state.focus_end_time = time.time() + st.session_state.focus_remaining
                st.rerun()
            if c2.button("⏸", key="z_pause"):
                st.session_state.focus_running = False
                st.session_state.focus_end_time = None
            if c3.button("🔄", key="z_reset"):
                st.session_state.focus_running = False
                st.session_state.focus_mode = "Study"
                st.session_state.focus_remaining = st.session_state.study_duration * 60
                st.session_state.focus_end_time = None
            st.divider()
            new_study = st.number_input("Study (min)", 5, 120, st.session_state.study_duration, 5)
            if new_study != st.session_state.study_duration:
                st.session_state.study_duration = new_study
                update_durations(); st.rerun()
            new_break = st.number_input("Break (min)", 1, 60, st.session_state.break_duration, 1)
            if new_break != st.session_state.break_duration:
                st.session_state.break_duration = new_break
                update_durations(); st.rerun()
            st.divider()
            st.markdown("### Audio")
            m1, m2 = st.columns(2)
            if m1.button("▶", key="m_play"): st.session_state.music_enable = True
            if m2.button("⏹", key="m_stop"): st.session_state.music_enable = False
            
            st.file_uploader("Change Music", type=["mp3", "wav"], key="zen_music_up")
            if st.session_state.zen_music_up:
                st.session_state.music_upload = st.session_state.zen_music_up
            
            st.divider()
            st.selectbox("Theme", ["Night Study", "Daylight Study"], key="zen_theme")
            st.divider()
            if st.button("🚪 Exit Zen Mode", use_container_width=True, key="z_exit"):
                st.session_state.zen_toggle = False
                st.rerun()
    else:
        # Standard View Settings
        with st.expander("Timer Settings", expanded=True):
            new_study = st.number_input("Study minutes", 5, 120, st.session_state.study_duration, 5)
            if new_study != st.session_state.study_duration:
                st.session_state.study_duration = new_study
                update_durations(); st.rerun()
            new_break = st.number_input("Break minutes", 1, 60, st.session_state.break_duration, 1)
            if new_break != st.session_state.break_duration:
                st.session_state.break_duration = new_break
                update_durations(); st.rerun()

    # 3. TIMER LOGIC
    if st.session_state.focus_running and st.session_state.focus_end_time:
        remaining = int(st.session_state.focus_end_time - time.time())
        st.session_state.focus_remaining = max(remaining, 0)
        if remaining <= 0:
            st.session_state.focus_running = False
            if st.session_state.focus_mode == "Study":
                st.session_state.completed_sessions += 1
                st.session_state.focus_mode = "Break"
                st.session_state.focus_remaining = st.session_state.break_duration * 60
            else:
                st.session_state.focus_mode = "Study"
                st.session_state.focus_remaining = st.session_state.study_duration * 60

    # 4. RENDERING
    if not is_zen:
        st.markdown(f"<div class='timer-display'>{format_seconds(st.session_state.focus_remaining)}</div>", unsafe_allow_html=True)
        st.markdown(f"<div style='text-align:center; font-weight:700; margin-bottom:20px;'>{st.session_state.focus_mode.upper()} SESSION</div>", unsafe_allow_html=True)
        
        c1, c2, c3 = st.columns(3)
        if c1.button("Start", key="s_start", use_container_width=True):
            st.session_state.focus_running = True
            st.session_state.focus_end_time = time.time() + st.session_state.focus_remaining
            st.rerun()
        if c2.button("Pause", key="s_pause", use_container_width=True):
            st.session_state.focus_running = False
            st.session_state.focus_end_time = None
        if c3.button("Reset", key="s_reset", use_container_width=True):
            st.session_state.focus_running = False
            st.session_state.focus_mode = "Study"
            st.session_state.focus_remaining = st.session_state.study_duration * 60
            st.session_state.focus_end_time = None
        
        st.metric("Sessions Completed", st.session_state.completed_sessions)
        
        col_z1, col_z2 = st.columns([1, 1])
        with col_z1: st.toggle("Full Window Mode", key="zen_toggle")
        with col_z2:
            st.selectbox("Theme", ["Night Study", "Daylight Study"], key="zen_theme")
    else:
        theme = st.session_state.get("zen_theme", "Night Study")
        bg_css = "background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;"
        bg_path = f"data/{'bg_night.jpg' if theme == 'Night Study' else 'bg_light.jpg'}"
        if Path(bg_path).exists():
            with open(bg_path, "rb") as f:
                data = base64.b64encode(f.read()).decode()
            bg_css = f"background: url(data:image/jpeg;base64,{data}) no-repeat center center fixed !important; background-size: cover !important;"

        st.markdown(f"""
        <style>
            .stApp {{ {bg_css} height: 100vh !important; width: 100vw !important; position: fixed !important; top: 0; left: 0; }}
            .main .block-container {{ max-width: 100% !important; height: 100vh !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; padding: 0 !important; margin: 0 !important; background: transparent !important; }}
            .timer-display {{ font-size: 16rem !important; color: #ffffff !important; text-shadow: 0 0 80px rgba(0,0,0,1), 0 0 30px rgba(0,0,0,0.9) !important; font-weight: 900 !important; z-index: 1000; }}
            .zen-session-pill {{ background: rgba(0,0,0,0.7) !important; backdrop-filter: blur(20px) !important; padding: 12px 28px !important; border-radius: 40px !important; color: #ffffff !important; font-weight: 900 !important; font-size: 1.8rem !important; border: 2px solid rgba(255,255,255,0.3) !important; text-shadow: 0 4px 10px rgba(0,0,0,0.9) !important; margin-top: 30px; }}
        </style>
        """, unsafe_allow_html=True)
        
        st.markdown(f"<div class='timer-display'>{format_seconds(st.session_state.focus_remaining)}</div>", unsafe_allow_html=True)
        st.markdown(f"<div class='zen-session-pill'>SESSIONS: {st.session_state.completed_sessions}</div>", unsafe_allow_html=True)
        
        if st.session_state.get("music_enable"):
            audio_file = st.session_state.get("music_upload")
            if audio_file: st.audio(audio_file, format="audio/mpeg", loop=True)
            elif Path("data/zen_music.mp3").exists(): st.audio("data/zen_music.mp3", format="audio/mpeg", loop=True)

    if st.session_state.focus_running:
        time.sleep(1); st.rerun()


def _render_header_audio():
    """Helper to render the music player in the header/corner."""
    def _render_music_player(data_url: Optional[str]):
        if not data_url:
            return
        player_html = f"""
        <style>
          #music-player button {{ transition: all 0.2s ease; }}
          #music-player button:hover {{ background: rgba(255,255,255,0.1); transform: scale(1.05); }}
          #music-player button:active {{ transform: scale(0.95); }}
        </style>
        <div id='music-player' style='display: flex; justify-content: flex-end; margin-top: 1.2rem;'>
          <div style='background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(12px); padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; gap: 10px; color: #fff;'>
            <button id='toggleBtn' title='Play/Pause' style='border: none; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; justify-content: center;'>▶</button>
            <input id='vol' type='range' min='0' max='1' step='0.01' value='0.6' style='width: 60px; cursor: pointer; opacity: 0.5; accent-color: rgba(255,255,255,0.3);'>
            <audio id='bgAudio' src='{data_url}' loop></audio>
          </div>
        </div>
        <script>
          const a = document.getElementById('bgAudio');
          const btn = document.getElementById('toggleBtn');
          btn.onclick = () => {{
            if (a.paused) {{
              a.play();
              btn.innerHTML = '⏸';
              btn.style.color = 'rgba(255,255,255,0.9)';
            }} else {{
              a.pause();
              btn.innerHTML = '▶';
              btn.style.color = 'rgba(255,255,255,0.7)';
            }}
          }};
          document.getElementById('vol').oninput = (e) => a.volume = e.target.value;
        </script>
        """
        components_html(player_html, height=100)

    if st.session_state.get("music_enable") and st.session_state.get("music_upload"):
        uploaded = st.session_state.get("music_upload")
        try:
            raw = uploaded.getvalue()
            mime = uploaded.type or 'audio/mpeg'
            b64 = base64.b64encode(raw).decode('utf-8')
            data_url = f"data:{mime};base64,{b64}"
            _render_music_player(data_url)
        except Exception:
            pass

def main():
    # Force state persistence to prevent "Redirect to Home" bug on reruns
    if st.session_state.get("zen_toggle"):
        st.session_state.zen_toggle = True

    # LOAD & INITIALIZE USER SETTINGS
    if "settings_loaded" not in st.session_state:
        # 1. Start with defaults
        state_init = {
            "subjects_text": "Math, Physics, Chemistry, English",
            "days_left": 21,
            "total_hours": 5.0
        }
        
        # 2. Layer in saved JSON settings (if local)
        saved_json = load_user_settings()
        state_init.update(saved_json)
        
        # 3. Layer in URL Query Parameters (High Priority for Refreshes)
        try:
            # Modern Streamlit API
            params = st.query_params
            for k in params:
                val = params[k]
                if k in ["days_left"]: state_init[k] = int(val)
                elif k in ["total_hours"]: state_init[k] = float(val)
                else: state_init[k] = val
        except Exception:
            pass # Fallback for older Streamlit versions or issues
            
        # 4. Apply to session_state
        for k, v in state_init.items():
            if k not in st.session_state:
                st.session_state[k] = v
                
        st.session_state.settings_loaded = True
        
    # Use the toggle key directly as the source of truth
    is_zen = st.session_state.get("zen_toggle", False)

    # ZEN MODE ISOLATION: If active, render ONLY the focus mode and exit early
    if is_zen:
        _render_header_audio()
        render_focus_mode()
        return

    # Normal App Layout
    head_col1, head_col2 = st.columns([2, 1])
    with head_col1:
        st.title("Smart Study Planner")
        st.caption("ML-based daily subject allocation using Linear Regression and Random Forest.")
    with head_col2:
        _render_header_audio()

    model_bundle = get_model_bundle()

    with st.sidebar:
        st.header("Study Inputs")
        subject_text = st.text_area(
            "Subjects",
            value=st.session_state.get("subjects_text"),
            help="Enter subjects separated by commas.",
            key="subjects_text",
        )
        subjects = parse_subjects(subject_text)
        days_left = st.slider(
            "Days left for exam", 1, 120, 
            value=st.session_state.get("days_left"),
            key="days_left",
        )
        total_hours = st.slider(
            "Total available study hours per day", 1.0, 14.0, 
            value=st.session_state.get("total_hours"),
            key="total_hours",
        )

        st.divider()
        st.subheader("Subject Details")
        difficulty_by_subject = {}
        score_by_subject = {}

        for subject in subjects:
            with st.expander(subject, expanded=True):
                difficulty_by_subject[subject] = st.slider(
                    f"{subject} difficulty", 1, 5, 
                    value=st.session_state.get(f"{subject}_difficulty", 3),
                    key=f"{subject}_difficulty",
                )
                score_by_subject[subject] = st.slider(
                    f"{subject} past score", 0, 100, 
                    value=st.session_state.get(f"{subject}_score", 65),
                    key=f"{subject}_score",
                )

        st.info("Use the sliders as a what-if analysis.")
        st.divider()
        st.subheader("Audio")
        st.checkbox("Enable background music", value=False, key="music_enable")
        st.file_uploader("Upload light music (mp3/ogg/wav)", type=["mp3", "ogg", "wav"], key="music_upload")

    if not subjects:
        st.warning("Add at least one subject in the sidebar.")
        return

    subject_inputs = build_subject_inputs(subjects, difficulty_by_subject, score_by_subject, days_left)
    allocated_hours = allocate_study_hours(model_bundle.best_model, subject_inputs, total_hours)
    results = create_results_table(subject_inputs, allocated_hours)
    progress = load_progress()
    consistency_details = get_consistency_details(progress)
    progress = load_progress()
    consistency_details = get_consistency_details(progress)

    daily_tab, progress_tab, weekly_tab, insights_tab, focus_tab, data_tab = st.tabs(
        ["Daily Plan", "Progress", "Weekly Planner", "Insights", "Focus Mode", "Data"]
    )

    with daily_tab:
        st.subheader("Recommended Daily Plan")
        summary_col, model_col = st.columns([1.35, 1])
        with summary_col:
            display_results = results.copy()
            display_results["Study Hours"] = display_results["Study Hours"].apply(format_hours)
            st.dataframe(display_results, use_container_width=True, hide_index=True)
            st.pyplot(plot_allocations(results), clear_figure=True)

        with model_col:
            st.subheader("Model Comparison")
            st.dataframe(model_bundle.metrics, use_container_width=True, hide_index=True)
            st.success(f"Best model selected: {model_bundle.best_model_name}")

            st.subheader("Smart Suggestions")
            for suggestion in generate_suggestions(results):
                st.write(suggestion["message"])
                for reason in suggestion["reasons"]:
                    st.write(f"- {reason}")

            metric_a, metric_b = st.columns(2)
            metric_a.metric("Total Daily Time", format_hours(results['Study Hours'].sum()))
            metric_b.metric("High Priority", int((results["Priority"] == "High").sum()))

        if total_hours > 8:
            st.warning("This plan may lead to burnout.")
            st.write("Try a break schedule such as 50 minutes of study followed by a 10 minute break.")

    with progress_tab:
        st.subheader("Progress Tracker")

        progress_date = st.date_input("Progress date", value=date.today())
        actual_hours_by_subject = {}

        progress_cols = st.columns(min(len(results), 4))
        for index, (_, row) in enumerate(results.iterrows()):
            with progress_cols[index % len(progress_cols)]:
                actual_hours_by_subject[row["Subject"]] = st.number_input(
                    f"{row['Subject']} actual hours",
                    min_value=0.0,
                    max_value=24.0,
                    value=float(row["Study Hours"]),
                    step=0.25,
                    key=f"actual_{row['Subject']}",
                )

        if st.button("Save Progress", type="primary"):
            save_progress(results, actual_hours_by_subject, progress_date)
            st.success("Progress saved to data/progress.csv")
            progress = load_progress()
            consistency_details = get_consistency_details(progress)

        # Reset progress workflow with confirmation
        if st.button("Reset Progress", key="reset_trigger"):
            st.session_state.reset_confirm = True

        if st.session_state.get("reset_confirm"):
            st.warning("This will permanently delete all logged progress (data/progress.csv). Confirm to proceed.")
            confirm_col, cancel_col = st.columns(2)
            if confirm_col.button("Yes — Clear Progress", key="confirm_reset"):
                progress_path = ensure_progress_file()
                pd.DataFrame(columns=PROGRESS_COLUMNS).to_csv(progress_path, index=False)
                progress = load_progress()
                consistency_details = get_consistency_details(progress)
                st.success("Progress cleared.")
                st.session_state.reset_confirm = False
            if cancel_col.button("Cancel", key="cancel_reset"):
                st.session_state.reset_confirm = False

        streak = calculate_daily_streak(progress)

        metric_col_1, metric_col_2, metric_col_3 = st.columns(3)
        metric_col_1.metric("Consistency Score", f"{consistency_details['percentage']:.1f}%")
        metric_col_2.metric("Current Streak", f"{streak} days")
        metric_col_3.metric("Status Badge", consistency_details["status"])

        if consistency_details["is_overworked"]:
            st.warning("You studied more than planned. That effort counts, but this pattern can become overwork.")

        if progress.empty:
            st.info("Save progress to see planned vs actual study trends over time.")
        else:
            progress_summary = build_progress_summary(progress)
            st.pyplot(plot_progress(progress_summary), clear_figure=True)
            st.subheader("Study Heatmap Calendar")
            heatmap = plot_heatmap(progress_summary)
            if heatmap:
                st.pyplot(heatmap, clear_figure=True)

            day_metrics = get_productive_day_metrics(progress)
            metric_a, metric_b = st.columns(2)
            metric_a.metric("Most Productive Day", day_metrics["most_productive"])
            metric_b.metric("Least Productive Day", day_metrics["least_productive"])

            with st.expander("Progress Log"):
                st.dataframe(progress, use_container_width=True, hide_index=True)

    with weekly_tab:
        st.subheader("Smart Weekly Study Planner")

        # Gamification - XP / Level / Achievements
        if "weekly_plan_refresh" not in st.session_state:
            st.session_state.weekly_plan_refresh = 0
        
        col_left, col_right = st.columns([2, 1])
        with col_left:
            st.markdown("<div style='display:flex;align-items:center;gap:12px'>", unsafe_allow_html=True)
            xp = int(min(max(0, consistency_details.get("percentage", 0)), 100))
            level = 1 + xp // 25
            st.markdown(f"<div style='min-width:260px'>\n  <div style='font-weight:700;font-size:1.05rem'>Weekly XP</div>\n  <div class='xp-bar' style='margin-top:8px'>\n    <div class='xp-fill' style='width:{xp}%'></div>\n  </div>\n  <div style='margin-top:8px;font-weight:700'>{xp} XP — Level {level}</div>\n</div>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)

        with col_right:
            btns_col1, btns_col2 = st.columns(2)
            if btns_col1.button("Regenerate Plan", use_container_width=True):
                st.session_state.weekly_plan_refresh += 1
            if btns_col2.button("Claim XP", use_container_width=True):
                st.balloons()
                st.success("XP claimed!")

        # Generate weekly plan
        weekly_plan = generate_weekly_plan(
            results,
            total_hours,
            variation=st.session_state.weekly_plan_refresh,
        )
        daily_breakdown = summarize_weekly_plan(weekly_plan)
        
        # Day selection row (Horizontal "Tabs")
        available_days = daily_breakdown["Day"].tolist()
        
        if 'weekly_selected_day' not in st.session_state or st.session_state['weekly_selected_day'] not in available_days:
            st.session_state['weekly_selected_day'] = available_days[0]

        st.write("---")
        # Render day buttons in a horizontal row
        day_btn_cols = st.columns(len(available_days))
        for i, d in enumerate(available_days):
            is_selected = st.session_state['weekly_selected_day'] == d
            # Use a smaller font or cleaner label if needed, but the full date is good
            if day_btn_cols[i].button(d, key=f"btn_{d}", use_container_width=True, type="primary" if is_selected else "secondary"):
                st.session_state['weekly_selected_day'] = d
                st.rerun()

        # Layout: Day details on the left, Graph on the right
        col_details, col_graph = st.columns([1, 1.5])
        
        selected = st.session_state['weekly_selected_day']
        
        # Prepare data for mapping
        subj_group = weekly_plan.groupby(["Day", "Subject"])['Hours'].sum().reset_index()
        subjects_list = results['Subject'].unique().tolist()
        palette = px.colors.qualitative.Plotly
        subject_colors = {s: palette[i % len(palette)] for i, s in enumerate(subjects_list)}
        
        day_map = {d: {} for d in available_days}
        for _, r in subj_group.iterrows():
            day_map[r['Day']][r['Subject']] = float(r['Hours'])

        with col_details:
            st.markdown(f"### {selected}")
            subjects_hours = day_map.get(selected, {})
            total = sum(subjects_hours.values()) if subjects_hours else 0
            
            st.markdown(f"<div style='font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem;'>{format_hours(total)}</div>", unsafe_allow_html=True)
            
            if subjects_hours:
                for sub, hrs in subjects_hours.items():
                    color = subject_colors.get(sub, '#888')
                    st.markdown(f"""
                    <div style='display: flex; align-items: center; gap: 10px; margin-bottom: 8px;'>
                        <div style='width: 12px; height: 12px; border-radius: 50%; background: {color};'></div>
                        <div style='flex-grow: 1; font-weight: 600;'>{sub}</div>
                        <div style='font-weight: 700;'>{format_hours(hrs)}</div>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.info("No sessions scheduled.")

        with col_graph:
            entries = day_map.get(selected, {})
            if entries:
                labels = list(entries.keys())
                values = list(entries.values())
                fig = px.pie(names=labels, values=values, color=labels, color_discrete_map=subject_colors,
                             hole=0.4)
                fig.update_layout(
                    margin=dict(t=0, b=0, l=0, r=0),
                    legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5)
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.write("Graph unavailable.")

        st.write("---")
        with st.expander("Full Weekly Table"):
            st.dataframe(weekly_plan, use_container_width=True, hide_index=True)

    with insights_tab:
        st.subheader("Productivity Persona")
        persona = classify_productivity_persona(progress, consistency_details, days_left)
        st.markdown(
            f"""
            <div class="persona-card">
                <h3>{persona['persona']}</h3>
                <p>{persona['description']}</p>
                <p><strong>Advice:</strong> {persona['advice']}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.subheader("Model Explainability")
        importance_frame = get_random_forest_feature_importance(model_bundle)
        top_feature = importance_frame.iloc[0]["Feature"]
        st.pyplot(plot_feature_importance(importance_frame), clear_figure=True)
        st.info(f"{top_feature} has the highest impact on study time prediction.")

    with data_tab:
        st.subheader("Training Data Preview")
        st.dataframe(get_training_data().head(20), use_container_width=True, hide_index=True)
        st.subheader("Progress Data")
        st.dataframe(progress, use_container_width=True, hide_index=True)

    with focus_tab:
        render_focus_mode()

    persist_settings()


if __name__ == "__main__":
    main()
