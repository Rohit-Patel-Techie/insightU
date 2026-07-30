"""Central constants for the deterministic analytics engine.

Single source of truth for every numeric mapping and threshold. Nothing here
is hard-coded elsewhere; all services import from this module so the formulas
stay transparent and auditable.
"""

# Version stamp for cached AI reflections and summary payloads. Bump when the
# summary structure or scoring semantics change so stale caches are ignored.
ANALYTICS_VERSION = "1.0"

# --- Component normalization maps (all map to a 0..1 scale) -----------------

# Study completion (checkin.planned_study_status).
STUDY_COMPLETION_SCORES = {
    "complete": 1.0,
    "partial": 0.6,
    "not_today": 0.2,
}

# Mood (checkin.mood). Contextual signal included in the transparent Learning Score; never diagnostic.
MOOD_SCORES = {
    "excellent": 1.0,
    "good": 0.8,
    "okay": 0.6,
    "low": 0.4,
    "stressed": 0.2,
}

# Focus (checkin.focus_level). Tracked separately from the Learning Score.
FOCUS_SCORES = {
    "deep_focus": 1.0,
    "mostly_focused": 0.8,
    "average": 0.6,
    "frequently_distracted": 0.4,
    "could_not_focus": 0.2,
}

# Reflection: score = answered prompts / REFLECTION_PROMPT_COUNT.
REFLECTION_PROMPT_COUNT = 2

# Equal-weight Learning Score components approved for InsightU.
# Focus remains a separate descriptive metric and is not part of the score.
LEARNING_SCORE_COMPONENTS = (
    "study_completion",
    "study_hours",
    "habit",
    "reflection",
    "mood",
)
LEARNING_SCORE_COMPONENT_COUNT = 5

# Confidence for the Learning Score is "low" when fewer than all components are
# available for the day/period.
CONFIDENCE_FULL = "high"
CONFIDENCE_LOW = "low"

# --- Trend thresholds -------------------------------------------------------

# Minimum reported data points required before a trend direction is emitted.
TREND_MIN_POINTS = 4
# Relative change thresholds comparing the second-half average to the first.
TREND_INCREASING_THRESHOLD = 0.05
TREND_DECREASING_THRESHOLD = -0.05

# --- Study category choices (mirrors checkin.study_category contract) --------
STUDY_CATEGORIES = (
    "programming",
    "academics",
    "exam_prep",
    "project",
    "career",
    "reading",
    "other",
)
DEFAULT_STUDY_CATEGORY = "other"

# --- Distraction time-of-day buckets ----------------------------------------
DISTRACTION_TIME_BUCKETS = ("morning", "afternoon", "evening", "night")

# --- Profile study-plan defaults --------------------------------------------
# ISO weekdays: Monday=1 .. Sunday=7. Default study plan is Mon-Fri.
DEFAULT_STUDY_WEEKDAYS = [1, 2, 3, 4, 5]
DEFAULT_TIMEZONE = "UTC"

# --- Reflection theme keyword dictionary ------------------------------------
# Deterministic mapping from lowercase keyword -> canonical theme. Matching is
# done on whole-word/substring basis before any LLM involvement. This keeps the
# theme extraction transparent and reproducible.
REFLECTION_THEME_KEYWORDS = {
    "focus": (
        "focus", "focused", "concentrate", "concentration", "distract",
        "distracted", "attention", "zoned",
    ),
    "time_management": (
        "time", "schedule", "deadline", "procrastinat", "late", "early",
        "plan", "planning", "organized", "organised",
    ),
    "motivation": (
        "motivat", "energy", "energized", "lazy", "drive", "inspired",
        "willpower", "discipline",
    ),
    "study_progress": (
        "study", "studied", "revision", "revise", "practice", "practiced",
        "learn", "learned", "understood", "chapter", "topic", "syllabus",
    ),
    "wellbeing": (
        "sleep", "tired", "rest", "stress", "stressed", "anxious", "calm",
        "relax", "health", "exercise", "break",
    ),
    "consistency": (
        "consistent", "routine", "habit", "daily", "streak", "regular",
        "everyday", "every day",
    ),
    "environment": (
        "phone", "social media", "noise", "quiet", "environment", "friends",
        "family", "youtube", "gaming",
    ),
}
