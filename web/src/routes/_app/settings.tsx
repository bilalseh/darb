import type { Usage } from '@darb/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { profileQueryOptions } from '../../features/auth/profileQuery';
import { CheckoutReturn } from '../../features/settings/CheckoutReturn';
import { DeleteAccountSection } from '../../features/settings/DeleteAccountSection';
import { PlanSection } from '../../features/settings/PlanSection';
import { syncLanguage } from '../../features/settings/preferences';
import { RemindersSection } from '../../features/settings/RemindersSection';
import { card } from '../../features/settings/styles';
import { currentLanguage, isAppLanguage } from '../../i18n';
import { apiGet } from '../../lib/apiClient';
import { intlLocale } from '../../lib/dates';

export const Route = createFileRoute('/_app/settings')({
  // Stripe sends the learner back with ?checkout={session id}.
  validateSearch: z.object({
    checkout: z
      .string()
      .regex(/^cs_test_[A-Za-z0-9_]+$/)
      .optional()
      .catch(undefined),
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile: initialProfile } = Route.useRouteContext();
  const { checkout } = Route.useSearch();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQueryOptions(user.uid)).data ?? initialProfile;
  const usage = useQuery({
    queryKey: ['usage', user.uid],
    queryFn: () => apiGet<Usage>('/me/usage'),
  });

  const percent = usage.data
    ? Math.min(100, Math.round((100 * usage.data.used) / usage.data.limit))
    : 0;

  async function changeLanguage(value: string) {
    if (!isAppLanguage(value)) return;
    await i18n.changeLanguage(value);
    await syncLanguage(queryClient, user.uid, profile, value).catch(() => undefined);
  }

  return (
    <section aria-labelledby="settings-title" className="max-w-2xl space-y-6">
      <h1 id="settings-title" className="text-3xl font-bold tracking-tight">
        {t('settings.title')}
      </h1>
      {checkout && <CheckoutReturn uid={user.uid} sessionId={checkout} />}

      <section aria-labelledby="profile-title" className={card}>
        <h2 id="profile-title" className="text-lg font-semibold">
          {t('settings.profileTitle')}
        </h2>
        {profile.isDemo ? (
          <p className="mt-2 text-stone-700">{t('settings.demoAccount')}</p>
        ) : (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-stone-600">{t('settings.name')}</dt>
            <dd>{profile.displayName ?? '-'}</dd>
            <dt className="text-stone-600">{t('settings.email')}</dt>
            <dd className="break-all">
              <bdi>{profile.email ?? '-'}</bdi>
            </dd>
          </dl>
        )}
      </section>

      <PlanSection uid={user.uid} usage={usage.data} />

      <section aria-labelledby="usage-title" className={card}>
        <h2 id="usage-title" className="text-lg font-semibold">
          {t('settings.usageTitle')}
        </h2>
        {usage.data && (
          <>
            <p id="usage-value" className="mt-2">
              {t('settings.usageValue', { used: usage.data.used, limit: usage.data.limit })}
            </p>
            <div
              role="meter"
              aria-labelledby="usage-value"
              aria-valuemin={0}
              aria-valuemax={usage.data.limit}
              aria-valuenow={usage.data.used}
              className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"
            >
              <div
                className="h-full rounded-full bg-brand-700"
                style={{ width: `${String(percent)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {t('settings.usageResets', {
                time: new Intl.DateTimeFormat(intlLocale(i18n.language), {
                  timeStyle: 'short',
                }).format(new Date(usage.data.resetsAt)),
              })}
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="language-title" className={card}>
        <h2 id="language-title" className="text-lg font-semibold">
          {t('settings.languageTitle')}
        </h2>
        <label htmlFor="language" className="mt-2 block text-sm text-stone-600">
          {t('settings.languageLabel')}
        </label>
        <select
          id="language"
          value={currentLanguage()}
          onChange={(event) => void changeLanguage(event.target.value)}
          aria-describedby="language-hint"
          className="mt-1 rounded-md border border-stone-300 bg-white px-3 py-2"
        >
          <option value="en" lang="en">
            English
          </option>
          <option value="ar" lang="ar">
            العربية
          </option>
        </select>
        <p id="language-hint" className="mt-2 text-sm text-stone-600">
          {t('settings.aiLanguage')}
        </p>
      </section>

      <RemindersSection uid={user.uid} profile={profile} />
      <DeleteAccountSection />
    </section>
  );
}
