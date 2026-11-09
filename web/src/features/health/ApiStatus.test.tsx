import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiStatus } from './ApiStatus';

function renderStatus() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

describe('ApiStatus', () => {
  it('shows the API version once the health check succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ status: 'ok', version: 'abc1234' })),
    );
    renderStatus();

    expect(screen.getByRole('status')).toHaveTextContent('Checking API');
    expect(await screen.findByText('API online (abc1234)')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('reports the API as unreachable when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderStatus();

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });

  it('reports the API as unreachable on an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    renderStatus();

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });
});
