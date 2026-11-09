"""The demo's hand-written Spanish plan: 8 weeks, started three weeks ago, two weeks done."""

from datetime import datetime, timedelta

from darb_api.domain.plan import build_week, monday_of
from darb_api.schemas.onboarding import Weekday
from darb_api.schemas.plan import (
    LessonDraft,
    LessonKind,
    LessonStatus,
    Plan,
    PlanModule,
    PlanWeek,
    WeekDraft,
)

L, P, R, J = LessonKind.LEARN, LessonKind.PRACTICE, LessonKind.REVIEW, LessonKind.PROJECT

# (module title, summary, [(week goal, [(title, objective, minutes, kind), ...]), ...])
_MODULES = [
    (
        "Survival Spanish",
        "Greetings, numbers and the handful of verbs you need from the first day of a trip.",
        [
            (
                "Greet people and introduce yourself",
                [
                    (
                        "Greetings and goodbyes",
                        "Use five common greetings in the right situation.",
                        80,
                        L,
                    ),
                    (
                        "Ser and estar basics",
                        "Describe yourself with ser and how you feel with estar.",
                        90,
                        L,
                    ),
                    ("Introduce yourself aloud", "Record a 30-second self-introduction.", 70, P),
                ],
            ),
            (
                "Handle numbers, prices and time",
                [
                    ("Numbers 1 to 100", "Read and say prices and phone numbers.", 80, L),
                    ("Telling the time", "Ask for and give the time in two ways.", 80, L),
                    ("Week one review", "Revisit greetings and numbers with flashcards.", 80, R),
                ],
            ),
            (
                "Order food and drinks",
                [
                    ("Café vocabulary", "Name 20 common foods and drinks.", 80, L),
                    ("Ordering politely", "Use quisiera and me pone to order.", 80, P),
                    (
                        "Role-play: at the café",
                        "Order a full breakfast in a recorded role-play.",
                        80,
                        J,
                    ),
                ],
            ),
        ],
    ),
    (
        "Everyday conversations",
        "Present tense, questions and small talk so you can keep a short conversation going.",
        [
            (
                "Talk about your day in the present tense",
                [
                    ("Regular -ar verbs", "Conjugate ten -ar verbs in the present.", 80, L),
                    ("Daily routine", "Describe your morning in six sentences.", 80, P),
                    (
                        "Listening: a day in Madrid",
                        "Follow a slow podcast about a daily routine.",
                        80,
                        P,
                    ),
                ],
            ),
            (
                "Ask questions and understand answers",
                [
                    ("Question words", "Use qué, dónde, cuándo, cómo and por qué.", 80, L),
                    ("Asking for directions", "Ask for and follow simple directions.", 80, P),
                    ("Module review", "Mix present tense and questions in a timed quiz.", 80, R),
                ],
            ),
            (
                "Make small talk",
                [
                    ("Likes with gustar", "Say what you and others like.", 80, L),
                    ("Weather and plans", "Talk about the weather and weekend plans.", 80, P),
                    (
                        "Conversation practice",
                        "Hold a five-minute chat with a language partner.",
                        80,
                        J,
                    ),
                ],
            ),
        ],
    ),
    (
        "Travel ready",
        "The past tense and real travel situations, ending with a full trip rehearsal.",
        [
            (
                "Tell short stories in the past",
                [
                    ("Preterite of regular verbs", "Say what you did yesterday.", 80, L),
                    (
                        "Irregular past: ir, ser, hacer",
                        "Use the three most common irregular verbs.",
                        80,
                        L,
                    ),
                    ("Travel diary", "Write a short diary entry about a trip.", 80, P),
                ],
            ),
            (
                "Rehearse the trip",
                [
                    (
                        "Hotel and transport",
                        "Check in and buy a train ticket in role-plays.",
                        80,
                        P,
                    ),
                    ("Course review", "Review the weakest topics from the whole plan.", 80, R),
                    (
                        "Trip rehearsal",
                        "Talk through a full day of your trip, start to finish.",
                        80,
                        J,
                    ),
                ],
            ),
        ],
    ),
]

DEMO_DAYS = [Weekday.MON, Weekday.WED, Weekday.SAT]
WEEKS_DONE = 2
LESSONS_DONE_IN_CURRENT_WEEK = 1


def demo_plan(now: datetime) -> Plan:
    start = monday_of((now - timedelta(weeks=3)).date())
    weeks: list[PlanWeek] = []
    for module_index, (_, _, module_weeks) in enumerate(_MODULES):
        for goal, lessons in module_weeks:
            draft = WeekDraft(
                goal=goal,
                lessons=[
                    LessonDraft(title=t, objective=o, minutes=m, kind=k) for t, o, m, k in lessons
                ],
            )
            weeks.append(build_week(len(weeks), module_index, draft, start, DEMO_DAYS, start))

    def finished(week: PlanWeek) -> PlanWeek:
        done = len(week.lessons) if week.index < WEEKS_DONE else LESSONS_DONE_IN_CURRENT_WEEK
        if week.index > WEEKS_DONE:
            done = 0
        lessons = [
            lesson.model_copy(update={"status": LessonStatus.DONE}) if n < done else lesson
            for n, lesson in enumerate(week.lessons)
        ]
        return week.model_copy(update={"lessons": lessons})

    return Plan(
        skill_id="",  # filled in when the demo skill is written
        modules=[PlanModule(title=title, summary=summary) for title, summary, _ in _MODULES],
        weeks=[finished(week) for week in weeks],
        difficulty=0,
        generated_at=now - timedelta(weeks=3),
    )
