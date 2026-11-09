import type { Profile } from '@darb/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { preferencesOf, savePreferences, type FullPreferences } from './preferences';
import { card } from './styles';

type Reminder = 'checkinReminders' | 'reviewReminders';
const REMINDERS: Reminder[] = ['checkinReminders', 'reviewReminders'];

export function RemindersSection({ uid, profile }: { uid: string; profile: Profile }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Shown at once; put back if saving fails.
  const [preferences, setPreferences] = useState(() => preferencesOf(profile));
  const save = useMutation({
    mutationFn: (next: FullPreferences) => savePreferences(queryClient, uid, next),
    onError: () => {
      setPreferences(preferencesOf(profile));
    },
  });

  return (
    <section aria-labelledby="reminders-title" className={card}>
      <h2 id="reminders-title" className="text-lg font-semibold">
        {t('settings.remindersTitle')}
      </h2>
      <p className="mt-1 text-sm text-stone-600">{t('settings.remindersBody')}</p>
      <div className="mt-3 space-y-2">
        {REMINDERS.map((key) => (
          <label key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(event) => {
                const next = { ...preferences, [key]: event.target.checked };
                setPreferences(next);
                save.mutate(next);
              }}
              className="size-5 accent-brand-700"
            />
            {t(`settings.${key}`)}
          </label>
        ))}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm">
        {save.isSuccess && <span className="text-brand-800">{t('settings.saved')}</span>}
        {save.isError && <span className="text-red-800">{t('settings.saveFailed')}</span>}
      </p>
    </section>
  );
}
