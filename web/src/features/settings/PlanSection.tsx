import type { Usage } from '@darb/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { profileQueryOptions } from '../auth/profileQuery';
import { cancelPro } from '../billing/billingApi';
import { card } from './styles';

interface PlanSectionProps {
  uid: string;
  usage: Usage | undefined;
}

export function PlanSection({ uid, usage }: PlanSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: cancelPro,
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryOptions(uid).queryKey, profile);
      await queryClient.invalidateQueries({ queryKey: ['usage', uid] });
      await queryClient.invalidateQueries({ queryKey: ['billing', uid] });
    },
  });
  if (!usage) return null;
  const isPro = usage.tier === 'pro';

  return (
    <section aria-labelledby="plan-title" className={card}>
      <h2 id="plan-title" className="text-lg font-semibold">
        {t('settings.planTitle')}
      </h2>
      <p className="mt-2 text-xl font-semibold text-brand-800">
        {isPro ? t('settings.planPro') : t('settings.planFree')}
      </p>
      <p className="mt-1 text-stone-700">
        {t('settings.skillsLabel')}:{' '}
        <bdi>
          {usage.skillLimit == null
            ? `${String(usage.skills)} (${t('settings.unlimited')})`
            : `${String(usage.skills)} / ${String(usage.skillLimit)}`}
        </bdi>
      </p>
      <div className="mt-4">
        {isPro ? (
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => {
              cancel.mutate();
            }}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          >
            {cancel.isPending ? t('settings.cancelling') : t('settings.cancelPro')}
          </button>
        ) : (
          <Link
            to="/pricing"
            className="inline-flex rounded-md bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800"
          >
            {t('settings.upgrade')}
          </Link>
        )}
        {cancel.isError && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {t('settings.cancelFailed')}
          </p>
        )}
      </div>
    </section>
  );
}
