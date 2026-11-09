import type { Usage } from '@darb/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useOnboardingStore } from '../../features/onboarding/onboardingStore';
import { apiDelete, apiGet } from '../../lib/apiClient';
import { deleteAccount } from '../../lib/session';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

const CONFIRM_WORD = 'DELETE';
const card = 'rounded-lg border border-stone-200 bg-white p-5';

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState('');
  const usage = useQuery({
    queryKey: ['usage', user.uid],
    queryFn: () => apiGet<Usage>('/me/usage'),
  });
  const remove = useMutation({
    mutationFn: async () => {
      await apiDelete('/me');
      await deleteAccount();
    },
    onSuccess: async () => {
      queryClient.clear();
      useOnboardingStore.getState().reset();
      await navigate({ to: '/' });
    },
  });

  const percent = usage.data
    ? Math.min(100, Math.round((100 * usage.data.used) / usage.data.limit))
    : 0;

  return (
    <section aria-labelledby="settings-title" className="max-w-2xl space-y-6">
      <h1 id="settings-title" className="text-3xl font-bold tracking-tight">
        {t('settings.title')}
      </h1>

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
            <dd>{profile.email ?? '-'}</dd>
          </dl>
        )}
      </section>

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
                time: new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' }).format(
                  new Date(usage.data.resetsAt),
                ),
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
          value="en"
          onChange={() => undefined}
          className="mt-1 rounded-md border border-stone-300 bg-white px-3 py-2"
        >
          <option value="en">English</option>
          <option value="ar" disabled>
            {t('settings.languageSoon')}
          </option>
        </select>
      </section>

      <section
        aria-labelledby="delete-title"
        className="rounded-lg border border-red-200 bg-red-50 p-5"
      >
        <h2 id="delete-title" className="text-lg font-semibold text-red-900">
          {t('settings.deleteTitle')}
        </h2>
        <p className="mt-2 text-red-900">{t('settings.deleteBody')}</p>
        <label htmlFor="confirm-delete" className="mt-4 block text-sm font-medium text-red-900">
          {t('settings.deleteConfirmLabel')}
        </label>
        <input
          id="confirm-delete"
          value={confirm}
          autoComplete="off"
          onChange={(event) => {
            setConfirm(event.target.value);
          }}
          className="mt-1 rounded-md border border-red-300 bg-white px-3 py-2"
        />
        <button
          type="button"
          disabled={confirm !== CONFIRM_WORD || remove.isPending}
          onClick={() => {
            remove.mutate();
          }}
          className="ms-3 rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {remove.isPending ? t('settings.deleting') : t('settings.deleteButton')}
        </button>
        {remove.isError && (
          <p role="alert" className="mt-3 text-sm text-red-900">
            {t('settings.deleteFailed')}
          </p>
        )}
      </section>
    </section>
  );
}
