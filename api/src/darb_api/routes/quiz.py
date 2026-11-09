"""End-of-module quizzes and the spaced-repetition review queue they feed."""

import uuid

from fastapi import APIRouter, HTTPException, status

from darb_api.ai.types import AiUnavailableError
from darb_api.auth import CurrentUser
from darb_api.dependencies import AiDep, ClockDep, RepositoryDep, SettingsDep
from darb_api.domain import lessons as lesson_rules
from darb_api.domain import review as rules
from darb_api.prompts import render
from darb_api.repository import StoredQuiz
from darb_api.routes.common import AI_UNAVAILABLE, conflict, count_ai_request, require_skill
from darb_api.schemas.quiz import (
    ModuleQuiz,
    ModuleQuizDraft,
    QuestionResult,
    QuizQuestion,
    QuizResult,
    QuizSubmission,
    ReviewAnswer,
    ReviewItem,
    ReviewOutcome,
)

router = APIRouter(tags=["quiz"])


def _public(quiz: StoredQuiz) -> ModuleQuiz:
    return ModuleQuiz(
        skill_id=quiz.skill_id,
        module_index=quiz.module_index,
        title=quiz.title,
        questions=[
            QuizQuestion(id=f"q{n + 1}", prompt=q.prompt, options=q.options)
            for n, q in enumerate(quiz.questions)
        ],
    )


@router.post("/skills/{skill_id}/modules/{module_index}/quiz")
async def start_module_quiz(
    skill_id: str,
    module_index: int,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> ModuleQuiz:
    """Start the module's quiz, or resume the unsubmitted one without a new AI call."""
    stored = await repository.get_quiz(user.uid, skill_id, module_index)
    if stored is not None:
        return _public(stored)
    skill = await require_skill(repository, user.uid, skill_id)
    plan = await repository.get_plan(user.uid, skill_id)
    if plan is None or not 0 <= module_index < len(plan.modules):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No such module")
    module = plan.modules[module_index]
    lessons = [
        f"- {lesson.title}: {lesson.objective}"
        for week in plan.weeks
        if week.module_index == module_index
        for lesson in week.lessons
    ]

    await count_ai_request(repository, user, clock, settings)
    prompt = render(
        "module_quiz",
        skill=skill.answers.skill,
        level=skill.placement.level.value if skill.placement else skill.answers.level.value,
        module=module.title,
        lessons="\n".join(lessons),
    )
    try:
        result = await ai.generate(prompt.task, ModuleQuizDraft, prompt.system, prompt.user)
    except AiUnavailableError as error:
        raise AI_UNAVAILABLE from error
    stored = StoredQuiz(
        skill_id=skill_id,
        module_index=module_index,
        title=module.title,
        questions=result.value.questions,
        created_at=clock(),
    )
    await repository.save_quiz(user.uid, stored)
    return _public(stored)


@router.post("/skills/{skill_id}/modules/{module_index}/quiz/submit")
async def submit_module_quiz(
    skill_id: str,
    module_index: int,
    submission: QuizSubmission,
    user: CurrentUser,
    repository: RepositoryDep,
    clock: ClockDep,
) -> QuizResult:
    """Grade the quiz; every missed question becomes a review card due tomorrow."""
    stored = await repository.get_quiz(user.uid, skill_id, module_index)
    if stored is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No quiz in progress")
    questions = stored.questions
    if len(submission.answers) != len(questions):
        raise conflict(f"Answer all {len(questions)} questions")
    if any(
        choice >= len(q.options) for choice, q in zip(submission.answers, questions, strict=True)
    ):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Unknown option")

    now = clock()
    results = [
        QuestionResult(
            id=f"q{n + 1}",
            prompt=q.prompt,
            options=q.options,
            chosen=choice,
            correct_option=q.correct_option,
            correct=choice == q.correct_option,
            explanation=q.explanation,
        )
        for n, (q, choice) in enumerate(zip(questions, submission.answers, strict=True))
    ]
    reviews = [
        ReviewItem(
            id=uuid.uuid4().hex,
            skill_id=skill_id,
            prompt=r.prompt,
            options=r.options,
            correct_option=r.correct_option,
            explanation=r.explanation,
            box=0,
            due_on=rules.first_review(now.date()),
            last_reviewed_on=None,
        )
        for r in results
        if not r.correct
    ]
    result = QuizResult(
        skill_id=skill_id,
        module_index=module_index,
        title=stored.title,
        score=rules.score([q.correct_option for q in questions], submission.answers),
        results=results,
        added_to_review=len(reviews),
        completed_at=now,
    )
    await repository.finish_quiz(user.uid, result, reviews)
    return result


@router.post("/reviews/{review_id}/answer")
async def answer_review(
    review_id: str,
    answer: ReviewAnswer,
    user: CurrentUser,
    repository: RepositoryDep,
    clock: ClockDep,
) -> ReviewOutcome:
    """Answer a review card: right moves it up a box, wrong sends it back to tomorrow."""
    item = await repository.get_review(user.uid, review_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No such review card")
    problem = lesson_rules.completion_date_problem(answer.answered_on, clock().date())
    if problem:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=problem)
    correct = answer.choice == item.correct_option
    box, due_on = rules.next_review(item.box, correct, answer.answered_on)
    item = item.model_copy(
        update={"box": box, "due_on": due_on, "last_reviewed_on": answer.answered_on}
    )
    await repository.save_review(user.uid, item)
    await repository.record_review(user.uid, answer.answered_on.isoformat())
    return ReviewOutcome(item=item, correct=correct)
