import type { Plan, WeekAdjustment } from '@darb/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, type SearchSchemaInput } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { aiProblem } from '../../features/assessment/assessmentApi';
import { CommunityMatches } from '../../features/plan/CommunityMatches';
import { PlanCalendar } from '../../features/plan/PlanCalendar';
import {
  createPlan,
  moveLesson,
  planQueryKey,
  planQueryOptions,
  regenerateWeek,
  withLessonMoved,
} from '../../features/plan/planApi';
import { Roadmap } from '../../features/plan/Roadmap';
import { skillsQueryOptions } from '../../features/skills/skillsQuery';
import { todayLocalIso } from '../../lib/dates';

export const Route = createFileRoute('/_app/plan')({
  validateSearch: (search: { skill?: unknown } & SearchSchemaInput) => ({
    skill: typeof search.skill === 'string' ? search.skill : undefined,
  }),
  component: PlanPage,
});

const buttonClass =
  'rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60';

function PlanPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const skills = useQuery(skillsQueryOptions(user.uid));
  const skill = skills.data?.find((s) => s.id === search.skill) ?? skills.data?.[0];

  return (
    <section aria-labelledby="plan-title" className="space-y-6">
      <h1 id="plan-title" className="text-3xl font-bold tracking-tight">
        {t('nav.plan')}
      </h1>
      {skills.data && skills.data.length > 1 && (
        <nav aria-label={t('plan.skillPicker')} className="flex flex-wrap gap-2">
          {skills.data.map((candidate) => (
            <Link
              key={candidate.id}
              to="/plan"
              search={{ skill: candidate.id }}
              aria-current={candidate.id === skill?.id ? 'page' : undefined}
              className="rounded-full border border-stone-300 px-3 py-1 text-sm aria-[current=page]:border-brand-700 aria-[current=page]:bg-brand-50"
            >
              {candidate.answers.skill}
            </Link>
          ))}
        </nav>
      )}
      {skills.isSuccess && !skill && (
        <p>
          {t('plan.noSkills')}{' '}
          <Link to="/onboarding" className="font-semibold text-brand-700 underline">
            {t('today.emptyCta')}
          </Link>
        </p>
      )}
      {skill && !skill.placement && (
        <p>
          {t('plan.needsPlacement')}{' '}
          <Link
            to="/skills/$skillId/assessment"
            params={{ skillId: skill.id }}
            className="font-semibold text-brand-700 underline"
          >
            {t('today.takePlacement', { skill: skill.answers.skill })}
          </Link>
        </p>
      )}
      {skill?.placement && (
        <SkillPlan uid={user.uid} skillId={skill.id} name={skill.answers.skill} />
      )}
    </section>
  );
}

function SkillPlan({ uid, skillId, name }: { uid: string; skillId: string; name: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const key = planQueryKey(uid, skillId);
  const plan = useQuery(planQueryOptions(uid, skillId));
  const [pendingWeek, setPendingWeek] = useState<number | null>(null);
  const today = todayLocalIso();

  const create = useMutation({
    mutationFn: () => createPlan(skillId),
    onSuccess: (created) => queryClient.setQueryData(key, created),
  });
  const regenerate = useMutation({
    mutationFn: ({ week, adjust }: { week: number; adjust: WeekAdjustment }) =>
      regenerateWeek(skillId, week, adjust),
    onMutate: ({ week }) => {
      setPendingWeek(week);
    },
    onSuccess: (updated) => queryClient.setQueryData(key, updated),
    onSettled: () => {
      setPendingWeek(null);
    },
  });
  const move = useMutation({
    mutationFn: ({ lessonId, date }: { lessonId: string; date: string }) =>
      moveLesson(skillId, lessonId, date),
    // Optimistic: show the move at once, roll back if the server refuses it.
    onMutate: ({ lessonId, date }) => {
      const previous = queryClient.getQueryData<Plan | null>(key);
      if (previous) queryClient.setQueryData(key, withLessonMoved(previous, lessonId, date));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (updated) => queryClient.setQueryData(key, updated),
  });

  if (plan.isPending) return <p role="status">{t('plan.loading')}</p>;
  if (plan.isError) return <p role="alert">{t('plan.loadError')}</p>;

  if (!plan.data) {
    return (
      <div className="max-w-xl rounded-lg border border-dashed border-stone-300 bg-white p-6">
        <h2 className="text-xl font-semibold">{t('plan.createTitle', { skill: name })}</h2>
        <p className="mt-2 text-stone-600">{t('plan.createBody')}</p>
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => {
            create.mutate();
          }}
          className={`${buttonClass} mt-4`}
        >
          {create.isPending ? t('plan.creating') : t('plan.create')}
        </button>
        {create.isError && (
          <p role="alert" className="mt-3 text-sm text-amber-900">
            {t(`assessment.problems.${aiProblem(create.error)}`)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="mb-3 text-xl font-semibold">{t('plan.calendarTitle')}</h2>
        <p className="mb-4 text-sm text-stone-600">{t('plan.calendarHint')}</p>
        <PlanCalendar
          plan={plan.data}
          today={today}
          onMove={(lessonId, date) => {
            move.mutate({ lessonId, date });
          }}
        />
        {move.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {t('plan.moveFailed')}
          </p>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-xl font-semibold">{t('plan.roadmapTitle')}</h2>
        <Roadmap
          plan={plan.data}
          today={today}
          pendingWeek={pendingWeek}
          onRegenerate={(week, adjust) => {
            regenerate.mutate({ week, adjust });
          }}
        />
        {regenerate.isError && (
          <p role="alert" className="mt-3 text-sm text-amber-900">
            {t(`assessment.problems.${aiProblem(regenerate.error)}`)}
          </p>
        )}
        <CommunityMatches skillId={skillId} />
      </div>
    </div>
  );
}
