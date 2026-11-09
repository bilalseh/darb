import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import i18n from '../../i18n';
import { getCurrentUser } from '../../lib/session';
import { createAppRouter } from '../../router';
import { fakeSession, GOOGLE_USER } from '../../test/fakeSession';
import { profileFor, stubApi } from '../../test/fixtures';

function renderPricing(billing: { available: boolean; tier: 'free' | 'pro' }) {
  stubApi({
    '/api/health': () => ({ status: 'ok', version: 'test' }),
    '/api/billing': () => ({ ...billing, priceCents: 500 }),
    '/api/me': () => {
      const user = getCurrentUser();
      if (!user) throw new Error('signed out');
      return profileFor(user);
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ['/pricing'] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'));
});

describe('pricing page', () => {
  it('labels checkout as test mode and asks visitors to sign in first', async () => {
    renderPricing({ available: true, tier: 'free' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Plans' })).toBeInTheDocument();
    expect(screen.getByText(/4242 4242 4242 4242/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Sign in or try the demo to upgrade' }),
    ).toBeInTheDocument();
  });

  it('offers the test checkout to signed-in Free learners', async () => {
    fakeSession.setUser(GOOGLE_USER);
    renderPricing({ available: true, tier: 'free' });

    const upgrade = await screen.findByRole('button', { name: 'Upgrade to Pro (test mode)' });
    await waitFor(() => {
      expect(upgrade).toBeEnabled();
    });
  });

  it('explains when checkout is not set up', async () => {
    fakeSession.setUser(GOOGLE_USER);
    renderPricing({ available: false, tier: 'free' });

    expect(
      await screen.findByText('Test checkout is not set up on this deployment yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upgrade to Pro (test mode)' })).toBeDisabled();
  });

  it('switches the whole page to Arabic, right to left', async () => {
    renderPricing({ available: true, tier: 'free' });
    await screen.findByRole('heading', { level: 1, name: 'Plans' });

    await act(() => i18n.changeLanguage('ar'));

    expect(screen.getByRole('heading', { level: 1, name: 'الخطط' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
  });
});
