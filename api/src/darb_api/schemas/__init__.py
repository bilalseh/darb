"""Public API models, exported to shared/ by `pnpm gen:schemas` (see docs/adr/0005).

Request models also get generated Zod schemas, so frontend forms validate with the same rules.
"""

from pydantic import BaseModel

from darb_api.schemas.assessment import (
    AnswerSubmission,
    AssessmentProgress,
    AssessmentQuestion,
    PlacementLevel,
    PlacementResult,
    QuestionKind,
    SubskillScore,
)
from darb_api.schemas.checkin import Checkin, CheckinRequest, SyncRequest, SyncResult
from darb_api.schemas.health import HealthResponse
from darb_api.schemas.lesson import CompleteLessonRequest, LessonContent, Stats, TutorRequest
from darb_api.schemas.onboarding import (
    LearningStyle,
    OnboardingAnswers,
    SelfRatedLevel,
    SkillReason,
    Weekday,
)
from darb_api.schemas.plan import MoveLessonRequest, Plan, RegenerateWeekRequest
from darb_api.schemas.profile import Profile
from darb_api.schemas.progress import CommunityMatch, Progress
from darb_api.schemas.quiz import (
    ModuleQuiz,
    QuizResult,
    QuizSubmission,
    ReviewAnswer,
    ReviewItem,
    ReviewOutcome,
)
from darb_api.schemas.skills import Skill, SkillStatus

REQUEST_MODELS: tuple[type[BaseModel], ...] = (
    OnboardingAnswers,
    AnswerSubmission,
    RegenerateWeekRequest,
    MoveLessonRequest,
    CompleteLessonRequest,
    TutorRequest,
    QuizSubmission,
    ReviewAnswer,
    CheckinRequest,
    SyncRequest,
)
RESPONSE_MODELS: tuple[type[BaseModel], ...] = (
    HealthResponse,
    Profile,
    Skill,
    AssessmentProgress,
    PlacementResult,
    Plan,
    LessonContent,
    Stats,
    ModuleQuiz,
    QuizResult,
    ReviewItem,
    ReviewOutcome,
    Checkin,
    SyncResult,
    Progress,
    CommunityMatch,
)

__all__ = [
    "REQUEST_MODELS",
    "RESPONSE_MODELS",
    "AnswerSubmission",
    "AssessmentProgress",
    "AssessmentQuestion",
    "HealthResponse",
    "LearningStyle",
    "OnboardingAnswers",
    "PlacementLevel",
    "PlacementResult",
    "Profile",
    "QuestionKind",
    "SelfRatedLevel",
    "Skill",
    "SkillReason",
    "SkillStatus",
    "SubskillScore",
    "Weekday",
]
