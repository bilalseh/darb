"""Placement assessment: one AI call writes the quiz, the server presents it one question at a
time (answers never leave the server), and one AI call reviews it at the end."""

from fastapi import APIRouter, HTTPException, Response, status

from darb_api.auth import CurrentUser
from darb_api.dependencies import AiDep, ClockDep, RepositoryDep, SettingsDep
from darb_api.domain import assessment as rules
from darb_api.prompts import render
from darb_api.repository import RecordedAnswer, StoredAssessment, UserRepository
from darb_api.routes.common import conflict, metered_ai, require_skill
from darb_api.schemas import (
    AnswerSubmission,
    AssessmentProgress,
    AssessmentQuestion,
    PlacementResult,
    QuestionKind,
    SubskillScore,
)
from darb_api.schemas.assessment import AssessmentReview, PlacementQuiz

router = APIRouter(tags=["assessment"], prefix="/skills/{skill_id}/assessment")


async def _assessment(repository: UserRepository, uid: str, skill_id: str) -> StoredAssessment:
    stored = await repository.get_assessment(uid, skill_id)
    if stored is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No assessment in progress")
    return stored


def _progress(stored: StoredAssessment) -> AssessmentProgress:
    questions = stored.quiz.questions
    index = rules.next_question(questions, stored.domain_answers())
    question = None
    if index is not None:
        spec = questions[index]
        question = AssessmentQuestion(
            id=rules.question_id(index),
            kind=spec.kind,
            prompt=spec.prompt,
            subskill=stored.quiz.subskill_named(spec.subskill),
            options=spec.options,
        )
    return AssessmentProgress(
        answered=len(stored.answers),
        max_questions=len(questions),
        question=question,
        finished=index is None,
    )


@router.post("")
async def start_assessment(
    skill_id: str,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> AssessmentProgress:
    """Start the placement assessment, or resume the one in progress without a new AI call."""
    skill = await require_skill(repository, user.uid, skill_id)
    if skill.placement is not None:
        raise conflict("This skill already has a placement result")
    stored = await repository.get_assessment(user.uid, skill_id)
    if stored is None:
        async with metered_ai(repository, user, clock, settings) as language:
            answers = skill.answers
            prompt = render(
                "placement_quiz",
                language=language,
                skill=answers.skill,
                reason=answers.reason.value,
                level=answers.level.value,
                style=answers.learning_style.value,
            )
            result = await ai.generate(prompt.task, PlacementQuiz, prompt.system, prompt.user)
        stored = StoredAssessment(
            quiz=result.value,
            answers=[],
            started_at=clock(),
            provider=result.provider,
            prompt_version=prompt.version,
        )
        await repository.save_assessment(user.uid, skill_id, stored)
    return _progress(stored)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def restart_assessment(
    skill_id: str, user: CurrentUser, repository: RepositoryDep
) -> Response:
    """Discard the test in progress, so the next start writes a new one."""
    skill = await require_skill(repository, user.uid, skill_id)
    if skill.placement is not None:
        raise conflict("This skill already has a placement result")
    await repository.delete_assessment(user.uid, skill_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/answers")
async def answer_question(
    skill_id: str, submission: AnswerSubmission, user: CurrentUser, repository: RepositoryDep
) -> AssessmentProgress:
    stored = await _assessment(repository, user.uid, skill_id)
    expected = rules.next_question(stored.quiz.questions, stored.domain_answers())
    if expected is None:
        raise conflict("The assessment is finished")
    if submission.question_id != rules.question_id(expected):
        raise conflict("Answer the current question")
    answer = RecordedAnswer(
        question_index=expected,
        choice=submission.choice,
        text=submission.text.strip() if submission.text else None,
        confidence=submission.confidence,
        dont_know=submission.dont_know,
    )
    problem = rules.answer_problem(stored.quiz.questions[expected], answer.to_domain())
    if problem:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[{"loc": ["body"], "msg": problem, "type": "value_error"}],
        )
    stored = stored.model_copy(update={"answers": [*stored.answers, answer]})
    await repository.save_assessment(user.uid, skill_id, stored)
    return _progress(stored)


def _review_prompt_sections(stored: StoredAssessment) -> tuple[str, str]:
    questions = stored.quiz.questions
    results, short_answers = [], []
    for answer in stored.domain_answers():
        question = questions[answer.question_index]
        qid = rules.question_id(answer.question_index)
        if answer.dont_know:
            results.append(
                f"- {question.subskill}, difficulty {question.difficulty}: "
                "the learner said they do not know this yet"
            )
        elif question.kind is QuestionKind.MULTIPLE_CHOICE:
            outcome = "correct" if rules.is_correct(question, answer) else "incorrect"
            results.append(f"- {question.subskill}, difficulty {question.difficulty}: {outcome}")
        elif question.kind is QuestionKind.CONFIDENCE:
            results.append(
                f'- {question.subskill}: rated "{question.prompt.en}" {answer.confidence}/5'
            )
        else:
            short_answers.append(
                f"- id: {qid} (short answer)\n  Question: {question.prompt.en}\n"
                f"  Reference answer: {question.reference_answer}\n"
                f'  Learner\'s answer: """{(answer.text or "")[:1000]}"""'
            )
    return "\n".join(results) or "(none)", "\n".join(short_answers) or "(none)"


@router.post("/complete")
async def complete_assessment(
    skill_id: str,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> PlacementResult:
    """Grade the short answers, work out the level and store the result on the skill."""
    skill = await require_skill(repository, user.uid, skill_id)
    stored = await _assessment(repository, user.uid, skill_id)
    questions, answers = stored.quiz.questions, stored.domain_answers()
    if rules.next_question(questions, answers) is not None:
        raise conflict("Answer every question first")

    async with metered_ai(repository, user, clock, settings) as language:
        results, short_answers = _review_prompt_sections(stored)
        prompt = render(
            "assessment_review",
            language=language,
            skill=skill.answers.skill,
            results=results,
            short_answers=short_answers,
        )
        review = await ai.generate(prompt.task, AssessmentReview, prompt.system, prompt.user)

    grades = {grade.question_id: grade.score for grade in review.value.grades}
    scores = rules.subskill_scores(stored.quiz.subskill_keys, questions, answers, grades)
    result = PlacementResult(
        level=rules.placement_level(scores),
        summary=review.value.summary,
        subskills=[
            SubskillScore(name=stored.quiz.subskill_named(key), score=score)
            for key, score in scores.items()
        ],
        completed_at=clock(),
    )
    await repository.save_placement(user.uid, skill_id, result)
    return result
