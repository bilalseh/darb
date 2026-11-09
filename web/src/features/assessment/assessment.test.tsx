import type { AssessmentProgress, PlacementResult } from '@darb/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createAppRouter } from '../../router';
import { fakeSession, GOOGLE_USER } from '../../test/fakeSession';
import { profileFor, SPANISH, stubApi } from '../../test/fixtures';

const ONBOARDED = { ...SPANISH, status: 'onboarded' as const, placement: null };

vi.mock('../skills/skillsQuery', () => ({
  skillsQueryKey: (uid: string) => ['skills', uid],
  skillsQueryOptions: (uid: string) => ({
    queryKey: ['skills', uid],
    queryFn: () => Promise.resolve([ONBOARDED]),
  }),
}));

const QUESTION: AssessmentProgress = {
  answered: 0,
  maxQuestions: 7,
  finished: false,
  question: {
    id: 'q1',
    kind: 'multiple_choice',
    prompt: 'How do you say "hello"?',
    subskill: 'Vocabulary',
    options: ['Hola', 'Adiós', 'Gracias'],
  },
};
const FINISHED: AssessmentProgress = {
  answered: 1,
  maxQuestions: 7,
  finished: true,
  question: null,
};
const RESULT: PlacementResult = {
  level: 'elementary',
  summary: 'Good everyday vocabulary; grammar is the next step.',
  subskills: [
    { name: 'Vocabulary', score: 62 },
    { name: 'Grammar', score: 41 },
    { name: 'Listening', score: 55 },
  ],
  completedAt: '2026-11-09T12:00:00Z',
};

function renderAssessment(routes: Record<string, () => unknown>) {
  fakeSession.setUser(GOOGLE_USER);
  const fetchMock = stubApi({ '/api/me': () => profileFor(GOOGLE_USER), ...routes });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ['/skills/skill-1/assessment'] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe('placement assessment', () => {
  it('asks the questions, then shows the level and every sub-skill score', async () => {
    const fetchMock = renderAssessment({
      '/api/skills/skill-1/assessment': () => QUESTION,
      '/api/skills/skill-1/assessment/answers': () => FINISHED,
      '/api/skills/skill-1/assessment/complete': () => RESULT,
    });

    await userEvent.click(await screen.findByRole('radio', { name: 'Hola' }, { timeout: 5000 }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Elementary' })).toBeVisible();
    expect(screen.getByText(RESULT.summary)).toBeInTheDocument();
    expect(screen.getByText('Grammar')).toBeInTheDocument();
    expect(screen.getByText('41 / 100')).toBeInTheDocument();
    const answerCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === 'string' && url.endsWith('/answers'),
    );
    const sent = answerCall?.[1]?.body;
    expect(typeof sent === 'string' && JSON.parse(sent)).toEqual({ questionId: 'q1', choice: 0 });
  });

  it('asks for an answer before continuing', async () => {
    renderAssessment({ '/api/skills/skill-1/assessment': () => QUESTION });

    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Pick one of the options.');
  });

  it('explains when the AI is unavailable', async () => {
    renderAssessment({});
    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith('/api/me')) return Promise.resolve(Response.json(profileFor(GOOGLE_USER)));
      const body = { detail: { code: 'ai_unavailable', message: 'resting' } };
      return Promise.resolve(Response.json(body, { status: 503 }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('The AI is resting right now.');
  });
});
