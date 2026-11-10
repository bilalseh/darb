import type { ReviewOutcome } from '@darb/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { statsQueryKey } from '../../features/lesson/lessonApi';
import { answerReview, dueReviewsQueryOptions } from '../../features/review/reviewApi';
import { useLocalized } from '../../lib/localized';

export const Route = createFileRoute('/_app/review')({
  component: ReviewPage,
});

function ReviewPage() {
  const { t } = useTranslation();
  const local = useLocalized();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const due = useQuery(dueReviewsQueryOptions(user.uid));
  const [position, setPosition] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const answer = useMutation({
    mutationFn: ({ id, picked }: { id: string; picked: number }) => answerReview(id, picked),
    onSuccess: async (result) => {
      setOutcome(result);
      await queryClient.invalidateQueries({ queryKey: statsQueryKey(user.uid) });
    },
  });

  const cards = due.data ?? [];
  const card = cards[position];

  function next() {
    setPosition((current) => current + 1);
    setChoice(null);
    setOutcome(null);
  }

  return (
    <section aria-labelledby="review-title" className="max-w-2xl space-y-6">
      <div>
        <h1 id="review-title" className="text-3xl font-bold tracking-tight">
          {t('review.title')}
        </h1>
        <p className="mt-2 text-stone-600">{t('review.intro')}</p>
      </div>
      {due.isPending && <p role="status">{t('review.loading')}</p>}
      {due.isError && <p role="alert">{t('review.loadError')}</p>}
      {due.isSuccess && !card && (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white p-6">
          {cards.length === 0
            ? t('review.nothingDue')
            : t('review.allDone', { count: cards.length })}
        </p>
      )}
      {card && (
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-600">
            {t('review.progress', { current: position + 1, total: cards.length })}
          </p>
          <fieldset className="mt-2">
            <legend className="text-xl font-semibold">
              <bdi>{local(card.prompt)}</bdi>
            </legend>
            <div className="mt-4 grid gap-2">
              {card.options.map((option, index) => {
                const reveal = outcome !== null;
                const isRight = index === card.correctOption;
                return (
                  <label
                    key={index}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      reveal && isRight
                        ? 'border-emerald-600 bg-emerald-50'
                        : reveal && index === choice
                          ? 'border-red-600 bg-red-50'
                          : 'border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={card.id}
                      checked={choice === index}
                      disabled={reveal}
                      onChange={() => {
                        setChoice(index);
                      }}
                      className="size-4 accent-brand-700"
                    />
                    <bdi>{local(option)}</bdi>
                    {reveal && isRight && (
                      <span className="ms-auto text-sm font-semibold">
                        {t('review.correctAnswer')}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {outcome ? (
            <div role="status" className="mt-4">
              <p className="font-semibold">
                {outcome.correct ? t('review.right') : t('review.wrong')}
              </p>
              <p dir="auto" className="mt-1 text-stone-700">
                {local(card.explanation)}
              </p>
              <button
                type="button"
                onClick={next}
                className="mt-4 rounded-md bg-brand-700 px-4 py-2 font-semibold text-white"
              >
                {t('review.next')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={choice === null || answer.isPending}
              onClick={() => {
                if (choice !== null) answer.mutate({ id: card.id, picked: choice });
              }}
              className="mt-4 rounded-md bg-brand-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {t('review.check')}
            </button>
          )}
          {answer.isError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {t('review.saveFailed')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
