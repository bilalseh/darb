import type { LessonContent } from '@darb/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { aiProblem } from '../assessment/assessmentApi';
import { askTutor, lessonContentQueryOptions } from './lessonApi';

interface TutorChatProps {
  skillId: string;
  lessonId: string;
  messages: LessonContent['tutor'];
}

export function TutorChat({ skillId, lessonId, messages }: TutorChatProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const ask = useMutation({
    mutationFn: (message: string) => askTutor(skillId, lessonId, message),
    onSuccess: (content) => {
      queryClient.setQueryData(lessonContentQueryOptions(skillId, lessonId).queryKey, content);
      setDraft('');
    },
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim()) ask.mutate(draft.trim());
  }

  return (
    <section
      aria-labelledby="tutor-title"
      className="rounded-lg border border-stone-200 bg-white p-4"
    >
      <h2 id="tutor-title" className="text-lg font-semibold">
        {t('lesson.tutorTitle')}
      </h2>
      <p className="text-sm text-stone-600">{t('lesson.tutorHint')}</p>
      <ol aria-live="polite" className="mt-4 space-y-3">
        {messages.map((message, index) => (
          <li
            key={`${message.at}-${String(index)}`}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
              message.role === 'learner' ? 'ms-auto bg-brand-50' : 'bg-stone-100'
            }`}
          >
            <span className="sr-only">
              {message.role === 'learner' ? t('lesson.you') : t('lesson.tutor')}:{' '}
            </span>
            <p dir="auto">{message.text}</p>
          </li>
        ))}
        {ask.isPending && (
          <li role="status" className="text-sm text-stone-600">
            {t('lesson.tutorThinking')}
          </li>
        )}
      </ol>
      {ask.isError && (
        <p role="alert" className="mt-3 text-sm text-amber-900">
          {t(`assessment.problems.${aiProblem(ask.error)}`)}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <label htmlFor="tutor-message" className="sr-only">
          {t('lesson.askLabel')}
        </label>
        <input
          id="tutor-message"
          value={draft}
          maxLength={800}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          placeholder={t('lesson.askPlaceholder')}
          className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={ask.isPending || !draft.trim()}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {t('lesson.ask')}
        </button>
      </form>
    </section>
  );
}
