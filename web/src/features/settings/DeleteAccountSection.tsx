import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiDelete } from '../../lib/apiClient';
import { deleteAccount } from '../../lib/session';
import { useOnboardingStore } from '../onboarding/onboardingStore';

const CONFIRM_WORD = 'DELETE';

export function DeleteAccountSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState('');
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

  return (
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
      <div className="mt-1 flex flex-wrap gap-3">
        <input
          id="confirm-delete"
          value={confirm}
          dir="ltr"
          autoComplete="off"
          onChange={(event) => {
            setConfirm(event.target.value);
          }}
          className="rounded-md border border-red-300 bg-white px-3 py-2"
        />
        <button
          type="button"
          disabled={confirm !== CONFIRM_WORD || remove.isPending}
          onClick={() => {
            remove.mutate();
          }}
          className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {remove.isPending ? t('settings.deleting') : t('settings.deleteButton')}
        </button>
      </div>
      {remove.isError && (
        <p role="alert" className="mt-3 text-sm text-red-900">
          {t('settings.deleteFailed')}
        </p>
      )}
    </section>
  );
}
