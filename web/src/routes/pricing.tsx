import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useAuthUser } from '../features/auth/useAuthUser';
import {
  billingStatusQueryOptions,
  formatPrice,
  startCheckout,
} from '../features/billing/billingApi';
import { ApiError } from '../lib/apiClient';

export const Route = createFileRoute('/pricing')({
  validateSearch: z.object({ checkout: z.literal('cancelled').optional() }),
  component: PricingPage,
});

const FALLBACK_PRICE_CENTS = 500;
const card = 'flex flex-col rounded-lg border bg-white p-6';

function Feature({ children }: { children: string }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className="text-brand-700">
        ✓
      </span>
      {children}
    </li>
  );
}

function PricingPage() {
  const { t, i18n } = useTranslation();
  const { checkout } = Route.useSearch();
  const user = useAuthUser();
  const status = useQuery({
    ...billingStatusQueryOptions(user?.uid ?? ''),
    enabled: Boolean(user),
  });
  const upgrade = useMutation({ mutationFn: startCheckout });
  const tier = status.data?.tier ?? 'free';
  const price = formatPrice(status.data?.priceCents ?? FALLBACK_PRICE_CENTS, i18n.language);
  const unavailable =
    status.data?.available === false ||
    (upgrade.error instanceof ApiError && upgrade.error.status === 503);

  return (
    <section aria-labelledby="pricing-title" className="space-y-8">
      <div className="max-w-2xl">
        <h1 id="pricing-title" className="text-3xl font-bold tracking-tight">
          {t('pricing.title')}
        </h1>
        <p className="mt-2 text-lg text-stone-600">{t('pricing.subtitle')}</p>
      </div>

      <p className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t('pricing.testMode')}
      </p>
      {checkout === 'cancelled' && (
        <p role="status" className="text-stone-700">
          {t('pricing.cancelled')}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <article aria-labelledby="plan-free" className={`${card} border-stone-200`}>
          <h2 id="plan-free" className="text-xl font-semibold">
            {t('pricing.freeName')}
          </h2>
          <p className="mt-2 text-3xl font-bold">{formatPrice(0, i18n.language)}</p>
          <ul className="mt-4 flex-1 space-y-2 text-stone-700">
            <Feature>{t('pricing.freeFeature1')}</Feature>
            <Feature>{t('pricing.freeFeature2')}</Feature>
            <Feature>{t('pricing.freeFeature3')}</Feature>
          </ul>
          <p className="mt-4 text-sm text-stone-600">{t('pricing.demoNote')}</p>
          {user && tier === 'free' && (
            <p className="mt-4 font-semibold text-brand-800">{t('pricing.current')}</p>
          )}
        </article>

        <article aria-labelledby="plan-pro" className={`${card} border-brand-600 shadow-sm`}>
          <h2 id="plan-pro" className="text-xl font-semibold">
            {t('pricing.proName')}
          </h2>
          <p className="mt-2 text-3xl font-bold">{t('pricing.perMonth', { price })}</p>
          <ul className="mt-4 flex-1 space-y-2 text-stone-700">
            <Feature>{t('pricing.proFeature1')}</Feature>
            <Feature>{t('pricing.proFeature2')}</Feature>
            <Feature>{t('pricing.proFeature3')}</Feature>
          </ul>
          <div className="mt-6">
            {!user && (
              <Link
                to="/sign-in"
                search={{ redirect: '/pricing' }}
                className="inline-flex rounded-md bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800"
              >
                {t('pricing.signInToUpgrade')}
              </Link>
            )}
            {user && tier === 'pro' && (
              <p className="font-semibold text-brand-800">{t('pricing.current')}</p>
            )}
            {user && tier === 'free' && (
              <button
                type="button"
                disabled={unavailable || status.isPending || upgrade.isPending}
                onClick={() => {
                  upgrade.mutate();
                }}
                className="rounded-md bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {upgrade.isPending ? t('pricing.redirecting') : t('pricing.upgrade')}
              </button>
            )}
            {user && unavailable && (
              <p className="mt-3 text-sm text-stone-600">{t('pricing.unavailable')}</p>
            )}
            {upgrade.isError && !unavailable && (
              <p role="alert" className="mt-3 text-sm text-red-800">
                {t('pricing.failed')}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
