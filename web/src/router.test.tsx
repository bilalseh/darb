import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { getCurrentUser } from './lib/session';
import { createAppRouter } from './router';
import { DEMO_USER, fakeSession, GOOGLE_USER } from './test/fakeSession';
import { profileFor, SPANISH, stubApi } from './test/fixtures';

vi.mock('./features/skills/skillsQuery', () => ({
  skillsQueryKey: (uid: string) => ['skills', uid],
  skillsQueryOptions: (uid: string) => ({
    queryKey: ['skills', uid],
    queryFn: () => Promise.resolve(uid === DEMO_USER.uid ? [SPANISH] : []),
  }),
}));

function renderAt(path: string) {
  stubApi({
    '/api/health': () => ({ status: 'ok', version: 'test' }),
    '/api/me': () => {
      const user = getCurrentUser();
      if (!user) throw new Error('signed out');
      return profileFor(user);
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('public pages', () => {
  it('offers the demo and Google sign-in on the home page', async () => {
    renderAt('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /plan that adapts/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try the demo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  it('renders the not-found page for unknown URLs', async () => {
    renderAt('/does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('offers a skip link to the main content', async () => {
    renderAt('/');
    expect(await screen.findByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
  });
});

describe('signed-in pages', () => {
  it('send signed-out visitors to sign in, then back', async () => {
    const router = renderAt('/plan');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in to Darb' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ redirect: '/plan' });

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Plan' })).toBeInTheDocument();
  });

  it('mark the current section in the main navigation', async () => {
    fakeSession.setUser(GOOGLE_USER);
    renderAt('/plan');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Plan' })).toBeInTheDocument();
    expect(nav.querySelector('a[aria-current="page"]')).toHaveTextContent('Plan');
  });

  it('show an empty state until the first skill exists', async () => {
    fakeSession.setUser(GOOGLE_USER);
    renderAt('/today');

    // The name sits in its own <bdi>, so match the whole paragraph's text.
    expect(
      await screen.findByText(
        (_, element) => element?.tagName === 'P' && element.textContent === 'Welcome back, Ada.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Start learning a skill' })).toHaveAttribute(
      'href',
      '/onboarding',
    );
  });
});

describe('the demo', () => {
  it('signs in and lands on Today with the seeded skill', async () => {
    renderAt('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Try the demo' }));

    expect(await screen.findByRole('heading', { level: 3, name: 'Spanish' })).toBeInTheDocument();
    expect(screen.getByText('Demo', { selector: 'span' })).toBeInTheDocument();
  });

  it('signs out back to the home page', async () => {
    fakeSession.setUser(DEMO_USER);
    renderAt('/today');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('button', { name: 'Try the demo' })).toBeInTheDocument();
  });
});
