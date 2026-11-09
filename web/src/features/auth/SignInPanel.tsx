import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { signInWithGoogle, startDemo, type SessionUser } from '../../lib/session';
import { profileQueryOptions } from './profileQuery';

type Method = 'google' | 'demo';

interface SignInPanelProps {
  onSignedIn: () => void;
}

function isCancelledPopup(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

export function SignInPanel({ onSignedIn }: SignInPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Method | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(method: Method, run: () => Promise<SessionUser>) {
    setPending(method);
    setError(null);
    try {
      const user = await run();
      // Creates the profile (and the demo seed) before any signed-in page renders.
      await queryClient.query(profileQueryOptions(user.uid));
      onSignedIn();
    } catch (caught) {
      setError(isCancelledPopup(caught) ? t('auth.errors.cancelled') : t('auth.errors.generic'));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-3">
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void signIn('demo', startDemo)}
        className="rounded-md bg-brand-700 px-4 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending === 'demo' ? t('auth.pending') : t('auth.demo')}
      </button>
      <p className="-mt-1 text-sm text-stone-600">{t('auth.demoHint')}</p>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void signIn('google', signInWithGoogle)}
        className="rounded-md border border-stone-300 bg-white px-4 py-2.5 font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
      >
        {pending === 'google' ? t('auth.pending') : t('auth.google')}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
