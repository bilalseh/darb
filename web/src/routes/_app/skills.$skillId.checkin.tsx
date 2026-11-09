import type { CheckinFeeling } from '@darb/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { aiProblem } from '../../features/assessment/assessmentApi';
import { submitCheckin } from '../../features/checkin/checkinApi';
import { planQueryKey } from '../../features/plan/planApi';

export const Route = createFileRoute('/_app/skills/$skillId/checkin')({
  component: CheckinPage,
});

const FEELINGS: readonly CheckinFeeling[] = ['too_easy', 'just_right', 'too_hard'];
const fieldClass = 'mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2';

function CheckinPage() {
  const { t } = useTranslation();
  const { skillId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [wentWell, setWentWell] = useState('');
  const [hard, setHard] = useState('');
  const [feeling, setFeeling] = useState<CheckinFeeling>('just_right');
  const checkin = useMutation({
    mutationFn: () => submitCheckin(skillId, { wentWell, hard, feeling }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: planQueryKey(user.uid, skillId) });
      await queryClient.invalidateQueries({ queryKey: ['sync', user.uid] });
    },
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    checkin.mutate();
  }

  return (
    <section aria-labelledby="checkin-title" className="max-w-2xl space-y-6">
      <div>
        <Link to="/today" className="text-sm font-medium text-brand-700 hover:underline">
          {t('assessment.backToToday')}
        </Link>
        <h1 id="checkin-title" className="mt-2 text-3xl font-bold tracking-tight">
          {t('checkin.title')}
        </h1>
        <p className="mt-2 text-stone-600">{t('checkin.intro')}</p>
      </div>

      {checkin.data ? (
        <div role="status" className="rounded-lg border border-brand-100 bg-brand-50 p-5">
          <h2 className="font-semibold">
            {t('checkin.changedTitle', { week: checkin.data.adjustedWeekIndex + 1 })}
          </h2>
          <p className="mt-2 text-stone-800">{checkin.data.explanation}</p>
          <Link
            to="/plan"
            search={{ skill: skillId }}
            className="mt-4 inline-flex font-semibold text-brand-700 underline"
          >
            {t('checkin.seePlan')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="went-well" className="font-medium">
              {t('checkin.wentWell')}
            </label>
            <textarea
              id="went-well"
              rows={3}
              maxLength={500}
              value={wentWell}
              onChange={(e) => {
                setWentWell(e.target.value);
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="hard" className="font-medium">
              {t('checkin.hard')}
            </label>
            <textarea
              id="hard"
              rows={3}
              maxLength={500}
              value={hard}
              onChange={(e) => {
                setHard(e.target.value);
              }}
              className={fieldClass}
            />
          </div>
          <fieldset>
            <legend className="font-medium">{t('checkin.feeling')}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEELINGS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 has-checked:border-brand-700 has-checked:bg-brand-50"
                >
                  <input
                    type="radio"
                    name="feeling"
                    checked={feeling === option}
                    onChange={() => {
                      setFeeling(option);
                    }}
                    className="size-4 accent-brand-700"
                  />
                  {t(`checkin.feelings.${option}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={checkin.isPending}
            className="rounded-md bg-brand-700 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {checkin.isPending ? t('checkin.submitting') : t('checkin.submit')}
          </button>
          {checkin.isError && (
            <p role="alert" className="text-sm text-amber-900">
              {t(`assessment.problems.${aiProblem(checkin.error)}`)}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
