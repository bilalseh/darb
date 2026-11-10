"""The demo learner's Survival Spanish quiz and the review cards its misses became. Written in
English and Arabic, like every test; the Spanish being learned stays Spanish in both."""

from datetime import datetime, timedelta

from darb_api.schemas.quiz import QuestionResult, QuizResult, ReviewItem
from darb_api.schemas.text import LocalizedText


def _t(en: str, ar: str | None = None) -> LocalizedText:
    return LocalizedText(en=en, ar=ar or en)


_Question = tuple[LocalizedText, list[LocalizedText], int, LocalizedText]

_REVIEW_CARDS: list[_Question] = [
    (
        _t(
            "Which verb describes a feeling that can change: 'Estoy cansado' or 'Soy cansado'?",
            "أيّ صيغة تصف شعورًا قد يتغير: 'Estoy cansado' أم 'Soy cansado'؟",
        ),
        [_t("Estoy cansado"), _t("Soy cansado")],
        0,
        _t(
            "Estar is used for states that change, like being tired.",
            "يُستخدم الفعل estar للحالات التي تتغير، مثل التعب.",
        ),
    ),
    (
        _t("How do you politely order a coffee?", "كيف تطلب قهوة بأدب؟"),
        [_t("Dame un café"), _t("Quisiera un café, por favor"), _t("Café ahora")],
        1,
        _t(
            "Quisiera (I would like) is polite and very common when ordering.",
            "كلمة Quisiera (أودّ) مهذبة وشائعة جدًا عند الطلب.",
        ),
    ),
    (
        _t("What is 'cuarenta y cinco'?", "ما معنى 'cuarenta y cinco'؟"),
        [_t("35"), _t("45"), _t("54")],
        1,
        _t(
            "Cuarenta is forty and cinco is five: 45.", "Cuarenta تعني أربعين وcinco تعني خمسة: 45."
        ),
    ),
]

_EXTRA_QUIZ_QUESTIONS: list[_Question] = [
    (
        _t("How do you say 'goodbye'?", "كيف تقول 'مع السلامة'؟"),
        [_t("Hola"), _t("Adiós"), _t("Gracias")],
        1,
        _t("Adiós means goodbye.", "Adiós تعني مع السلامة."),
    ),
    (
        _t("Which greeting fits the evening?", "أيّ تحية تناسب المساء؟"),
        [_t("Buenos días"), _t("Buenas noches")],
        1,
        _t("Buenas noches is used at night.", "تُقال Buenas noches في الليل."),
    ),
    (
        _t("What does 'gracias' mean?", "ما معنى 'gracias'؟"),
        [_t("Please", "من فضلك"), _t("Thank you", "شكرًا"), _t("Sorry", "آسف")],
        1,
        _t("Gracias means thank you.", "Gracias تعني شكرًا."),
    ),
    (
        _t("Which is 'twenty'?", "أيّها تعني 'عشرين'؟"),
        [_t("Doce"), _t("Veinte"), _t("Treinta")],
        1,
        _t("Veinte is twenty.", "Veinte تعني عشرين."),
    ),
    (
        _t("How do you ask the time?", "كيف تسأل عن الوقت؟"),
        [_t("¿Qué hora es?"), _t("¿Cómo estás?")],
        0,
        _t("¿Qué hora es? asks for the time.", "عبارة ¿Qué hora es? تسأل عن الوقت."),
    ),
]


def demo_reviews(now: datetime) -> tuple[ReviewItem, ...]:
    """Three cards from the demo learner's first-week check, due today."""
    today = now.date()
    return tuple(
        ReviewItem(
            id=f"demo-review-{n}",
            skill_id="",  # filled in when the demo skill is written
            prompt=prompt,
            options=options,
            correct_option=correct,
            explanation=explanation,
            box=0,
            due_on=today,
            last_reviewed_on=today - timedelta(days=1),
        )
        for n, (prompt, options, correct, explanation) in enumerate(_REVIEW_CARDS, start=1)
    )


def demo_quiz_results(now: datetime) -> tuple[QuizResult, ...]:
    """The Survival Spanish quiz, taken after week two; its misses became the review cards."""
    results = [
        QuestionResult(
            id=f"q{n}",
            prompt=prompt,
            options=options,
            chosen=correct if n > len(_REVIEW_CARDS) else (correct + 1) % len(options),
            correct_option=correct,
            correct=n > len(_REVIEW_CARDS),
            explanation=explanation,
        )
        for n, (prompt, options, correct, explanation) in enumerate(
            [*_REVIEW_CARDS, *_EXTRA_QUIZ_QUESTIONS], start=1
        )
    ]
    return (
        QuizResult(
            skill_id="",  # filled in when the demo skill is written
            module_index=0,
            title="Survival Spanish",
            score=round(100 * sum(r.correct for r in results) / len(results)),
            results=results,
            added_to_review=len(_REVIEW_CARDS),
            completed_at=now - timedelta(days=8),
        ),
    )
