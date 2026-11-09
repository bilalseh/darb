import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';

import { profileQueryOptions } from '../../features/auth/profileQuery';
import { preferencesOf } from '../../features/settings/preferences';
import { SkillCard } from '../../features/skills/SkillCard';
import { skillsQueryOptions } from '../../features/skills/skillsQuery';
import { StreakTile } from '../../features/today/StreakTile';
import { TodayLessons } from '../../features/today/TodayLessons';

export const Route = createFileRoute('/_app/today')({
  component: TodayPage,
});

const primaryLink =
  'inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800';

function TodayPage() {
  const { t } = useTranslation();
  const { user, profile: initialProfile } = Route.useRouteContext();
  const profile = useQuery(profileQueryOptions(user.uid)).data ?? initialProfile;
  const skills = useQuery(skillsQueryOptions(user.uid));

  const greeting = profile.isDemo ? (
    t('today.greetingDemo')
  ) : (
    <Trans
      i18nKey="today.greeting"
      values={{ name: profile.displayName ?? t('today.learner') }}
      components={{ bdi: <bdi /> }}
    />
  );

  return (
    <section aria-labelledby="today-title" className="space-y-8">
      <div>
        <h1 id="today-title" className="text-3xl font-bold tracking-tight">
          {t('nav.today')}
        </h1>
        <p className="mt-2 text-stone-600">{greeting}</p>
      </div>

      <StreakTile uid={user.uid} />
      {skills.isSuccess && skills.data.length > 0 && (
        <TodayLessons uid={user.uid} skills={skills.data} reminders={preferencesOf(profile)} />
      )}

      {skills.isPending && (
        <p role="status" className="text-stone-600">
          {t('today.loading')}
        </p>
      )}

      {skills.isError && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{t('today.loadError')}</p>
          <button
            type="button"
            onClick={() => void skills.refetch()}
            className="mt-2 font-semibold underline"
          >
            {t('today.retry')}
          </button>
        </div>
      )}

      {skills.isSuccess && skills.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6">
          <h2 className="text-xl font-semibold">{t('today.emptyTitle')}</h2>
          <p className="mt-2 max-w-prose text-stone-600">{t('today.emptyBody')}</p>
          <Link to="/onboarding" className={`${primaryLink} mt-4`}>
            {t('today.emptyCta')}
          </Link>
        </div>
      )}

      {skills.isSuccess && skills.data.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t('today.yourSkills')}</h2>
            <Link to="/onboarding" className={primaryLink}>
              {t('today.addSkill')}
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {skills.data.map((skill) => (
              <SkillCard key={skill.id} uid={user.uid} skill={skill} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
