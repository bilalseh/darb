import type { BillingStatus, CheckoutSession, Profile } from '@darb/shared';
import { queryOptions } from '@tanstack/react-query';

import { apiGet, apiPost } from '../../lib/apiClient';
import { intlLocale } from '../../lib/dates';

export function billingStatusQueryOptions(uid: string) {
  return queryOptions({
    queryKey: ['billing', uid],
    queryFn: () => apiGet<BillingStatus>('/billing'),
  });
}

/** Sends the browser to Stripe's hosted test-mode checkout. */
export async function startCheckout(): Promise<void> {
  const session = await apiPost<CheckoutSession>('/billing/checkout');
  const url = new URL(session.url);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('stripe.com')) {
    throw new Error('Unexpected checkout address');
  }
  window.location.assign(url.href);
}

export function confirmCheckout(sessionId: string) {
  return apiPost<Profile>('/billing/confirm', { sessionId });
}

export function cancelPro() {
  return apiPost<Profile>('/billing/cancel');
}

export function formatPrice(cents: number, language: string): string {
  return new Intl.NumberFormat(intlLocale(language), { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );
}
