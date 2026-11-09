import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { profileQueryOptions } from '../auth/profileQuery';
import { confirmCheckout } from '../billing/billingApi';

interface CheckoutReturnProps {
  uid: string;
  sessionId: string;
}

/** Back from Stripe: the API checks the session with Stripe before upgrading anyone. */
export function CheckoutReturn({ uid, sessionId }: CheckoutReturnProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const confirm = useQuery({
    queryKey: ['checkout', sessionId],
    queryFn: () => confirmCheckout(sessionId),
    retry: 2,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!confirm.data) return;
    queryClient.setQueryData(profileQueryOptions(uid).queryKey, confirm.data);
    void queryClient.invalidateQueries({ queryKey: ['usage', uid] });
    void queryClient.invalidateQueries({ queryKey: ['billing', uid] });
  }, [confirm.data, queryClient, uid]);

  if (confirm.isPending) {
    return (
      <p role="status" className="rounded-md bg-stone-100 px-4 py-3">
        {t('settings.checkoutConfirming')}
      </p>
    );
  }
  if (confirm.isError) {
    return (
      <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-amber-900">
        {t('settings.checkoutFailed')}
      </p>
    );
  }
  return (
    <p role="status" className="rounded-md bg-brand-50 px-4 py-3 font-semibold text-brand-800">
      {t('settings.checkoutSuccess')}
    </p>
  );
}
