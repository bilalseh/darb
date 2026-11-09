import {
  AnswerSubmissionSchema,
  type AnswerSubmission,
  type AssessmentQuestion,
} from '@darb/shared';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';

const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5] as const;

interface QuestionCardProps {
  question: AssessmentQuestion;
  number: number;
  pending: boolean;
  focusOnMount: boolean;
  onAnswer: (answer: AnswerSubmission) => void;
}

const optionClass =
  'flex cursor-pointer items-center gap-3 rounded-lg border border-stone-300 bg-white p-3 hover:border-brand-600 has-checked:border-brand-700 has-checked:bg-brand-50';

export function QuestionCard({
  question,
  number,
  pending,
  focusOnMount,
  onAnswer,
}: QuestionCardProps) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showError, setShowError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus();
  }, [focusOnMount]);

  function buildAnswer(): AnswerSubmission | null {
    const answer: AnswerSubmission = { questionId: question.id };
    if (question.kind === 'multiple_choice') {
      if (choice === null) return null;
      answer.choice = choice;
    } else if (question.kind === 'short_answer') {
      if (!text.trim()) return null;
      answer.text = text.trim();
    } else {
      if (confidence === null) return null;
      answer.confidence = confidence;
    }
    // The same rules the API enforces, generated from its Pydantic model.
    return AnswerSubmissionSchema.safeParse(answer).success ? answer : null;
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = buildAnswer();
    setShowError(answer === null);
    if (answer) onAnswer(answer);
  }

  const titleId = `question-${question.id}`;
  const errorId = `${titleId}-error`;

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={titleId} className="max-w-2xl">
      <p className="text-sm font-medium text-stone-600">
        {t('assessment.questionNumber', { number })} · <bdi>{question.subskill}</bdi>
      </p>
      <h2
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-bold tracking-tight focus:outline-none"
      >
        <bdi>{question.prompt}</bdi>
      </h2>

      <div className="mt-6" aria-describedby={showError ? errorId : undefined}>
        {question.kind === 'multiple_choice' && (
          <fieldset className="grid gap-3">
            <legend className="sr-only">{question.prompt}</legend>
            {question.options.map((option, index) => (
              <label key={option} className={optionClass}>
                <input
                  type="radio"
                  name={titleId}
                  checked={choice === index}
                  onChange={() => {
                    setChoice(index);
                  }}
                  className="size-4 accent-brand-700"
                />
                <bdi>{option}</bdi>
              </label>
            ))}
          </fieldset>
        )}

        {question.kind === 'short_answer' && (
          <>
            <label htmlFor={`${titleId}-text`} className="font-medium">
              {t('assessment.yourAnswer')}
            </label>
            <textarea
              id={`${titleId}-text`}
              value={text}
              maxLength={1000}
              rows={4}
              onChange={(event) => {
                setText(event.target.value);
              }}
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2"
            />
          </>
        )}

        {question.kind === 'confidence' && (
          <fieldset>
            <legend className="font-medium">{t('assessment.confidenceLegend')}</legend>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {CONFIDENCE_LEVELS.map((level) => (
                <label key={level} className={`${optionClass} flex-col justify-center text-center`}>
                  <input
                    type="radio"
                    name={titleId}
                    checked={confidence === level}
                    onChange={() => {
                      setConfidence(level);
                    }}
                    className="size-4 accent-brand-700"
                  />
                  <span className="text-sm">{t(`assessment.confidence.${level}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {showError && (
        <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-red-700">
          {t(`assessment.answerRequired.${question.kind}`)}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-700 px-5 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? t('assessment.saving') : t('assessment.submitAnswer')}
        </button>
        {/* Counts as a miss, so the level stays honest instead of rewarding lucky guesses. */}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            onAnswer({ questionId: question.id, dontKnow: true });
          }}
          className="rounded-md border border-stone-300 bg-white px-5 py-2 font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-60"
        >
          {t('assessment.dontKnow')}
        </button>
      </div>
    </form>
  );
}
