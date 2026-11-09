import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createAppRouter } from './router';

function renderAt(path: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ status: 'ok', version: 'test' })),
  );
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
}

describe('app routes', () => {
  it('renders the home page', async () => {
    renderAt('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /plan that adapts/i }),
    ).toBeInTheDocument();
  });

  it('renders the not-found page for unknown URLs', async () => {
    renderAt('/does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('marks the current section in the main navigation', async () => {
    renderAt('/plan');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Plan' })).toBeInTheDocument();
    expect(nav.querySelector('a[aria-current="page"]')).toHaveTextContent('Plan');
  });

  it('offers a skip link to the main content', async () => {
    renderAt('/');
    expect(await screen.findByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
  });
});
