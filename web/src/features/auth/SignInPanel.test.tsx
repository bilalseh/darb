import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { signInWithGoogle } from '../../lib/session';
import { DEMO_USER } from '../../test/fakeSession';
import { profileFor, stubApi } from '../../test/fixtures';
import { SignInPanel } from './SignInPanel';

function renderPanel(onSignedIn = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SignInPanel onSignedIn={onSignedIn} />
    </QueryClientProvider>,
  );
  return onSignedIn;
}

describe('SignInPanel', () => {
  it('creates the profile before reporting a demo sign-in', async () => {
    const fetchMock = stubApi({ '/api/me': () => profileFor(DEMO_USER) });
    const onSignedIn = renderPanel();

    await userEvent.click(screen.getByRole('button', { name: 'Try the demo' }));

    expect(onSignedIn).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init).toMatchObject({
      method: 'POST',
      headers: { Authorization: `Bearer token-${DEMO_USER.uid}` },
    });
  });

  it('explains a closed Google popup', async () => {
    vi.mocked(signInWithGoogle).mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    const onSignedIn = renderPanel();

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in was cancelled.');
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('reports a failed profile request', async () => {
    stubApi({});
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: 'Try the demo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in did not work.');
    expect(screen.getByRole('button', { name: 'Try the demo' })).toBeEnabled();
  });
});
