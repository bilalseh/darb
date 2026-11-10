import type { LessonContent, Plan, Skill } from '@darb/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../i18n';
import { todayLocalIso, addDaysIso } from '../../lib/dates';
import { createAppRouter } from '../../router';
import { DEMO_USER, fakeSession } from '../../test/fakeSession';
import { profileFor, SPANISH, stubApi } from '../../test/fixtures';

const TODAY = todayLocalIso();
const SKILL: Skill = {
  ...SPANISH,
  status: 'assessed',
  placement: {
    level: 'elementary',
    summary: { en: 'Good start.', ar: 'بداية جيدة.' },
    subskills: [],
    completedAt: TODAY,
  },
};
const PLAN: Plan = {
  skillId: SKILL.id,
  difficulty: 0,
  generatedAt: '2026-10-19T00:00:00Z',
  modules: [{ title: 'Survival Spanish', summary: 'The basics.' }],
  weeks: [
    {
      index: 0,
      startDate: addDaysIso(TODAY, -7),
      moduleIndex: 0,
      goal: 'Order food.',
      lessons: [
        lesson('w1-l1', 'Café vocabulary', addDaysIso(TODAY, -2)),
        lesson('w1-l2', 'Ordering politely', TODAY),
        lesson('w1-l3', 'Role-play', TODAY, 30),
      ],
    },
  ],
};
const CONTENT: LessonContent = {
  skillId: SKILL.id,
  lessonId: 'w1-l2',
  explanation: 'First paragraph about ordering.\n\nSecond paragraph <b>with tags</b>.',
  exercise: 'Order a coffee out loud three times.',
  resources: [
    { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Spanish', kind: 'reference' },
  ],
  tutor: [],
  generatedAt: '2026-11-09T00:00:00Z',
};

function lesson(id: string, title: string, scheduledDate: string, minutes = 40) {
  return {
    id,
    title,
    objective: 'Learn it well.',
    minutes,
    kind: 'learn' as const,
    scheduledDate,
    status: 'todo' as const,
  };
}

vi.mock('../skills/skillsQuery', () => ({
  skillsQueryKey: (uid: string) => ['skills', uid],
  skillsQueryOptions: (uid: string) => ({
    queryKey: ['skills', uid],
    queryFn: () => Promise.resolve([SKILL]),
  }),
}));
vi.mock('../plan/planApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../plan/planApi')>()),
  planQueryOptions: (uid: string, skillId: string) => ({
    queryKey: ['plan', uid, skillId],
    queryFn: () => Promise.resolve(PLAN),
  }),
}));

function renderAt(path: string, routes: Record<string, () => unknown> = {}) {
  fakeSession.setUser(DEMO_USER);
  const fetchMock = stubApi({
    '/api/me': () => profileFor(DEMO_USER),
    '/api/stats': () => ({
      streak: 3,
      longestStreak: 5,
      activeToday: false,
      lessonsDone: 7,
      minutesStudied: 560,
    }),
    ...routes,
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
  return fetchMock;
}

describe('Today', () => {
  it("shows today's lessons with a time estimate, missed ones, and the streak", async () => {
    renderAt('/today');

    expect(
      await screen.findByRole('heading', { name: '3-day streak' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Ordering politely/ })).toBeInTheDocument();
    expect(screen.getByText('About 70 minutes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catch up' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Café vocabulary/ })).toBeInTheDocument();
  });

  it('shows an English plan in Arabic once it is translated', async () => {
    const fetchMock = renderAt('/today', {
      '/api/skills/skill-1/plan/translation': () => ({
        language: 'ar',
        texts: { 'Ordering politely': 'الطلب بأدب' },
      }),
    });
    await screen.findByRole('link', { name: /Ordering politely/ }, { timeout: 5000 });

    await act(() => i18n.changeLanguage('ar'));

    expect(await screen.findByRole('link', { name: /الطلب بأدب/ })).toBeInTheDocument();
    // Lessons it did not return stay as written.
    expect(screen.getByRole('link', { name: /Role-play/ })).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(
      ([url]) => typeof url === 'string' && url.endsWith('/plan/translation'),
    );
    expect(call?.[1]?.body).toBe(JSON.stringify({ language: 'ar' }));
  });
});

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'));
});

describe('Lesson page', () => {
  it('shows the content as plain text with safe links, and marks the lesson done', async () => {
    const fetchMock = renderAt('/skills/skill-1/lessons/w1-l2', {
      '/api/skills/skill-1/lessons/w1-l2/content': () => CONTENT,
      '/api/skills/skill-1/lessons/w1-l2/complete': () => PLAN,
    });

    expect(
      await screen.findByText('First paragraph about ordering.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Second paragraph <b>with tags</b>.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Wikipedia' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }));

    const call = fetchMock.mock.calls.find(
      ([url]) => typeof url === 'string' && url.endsWith('/complete'),
    );
    expect(call?.[1]?.body).toBe(JSON.stringify({ completedOn: TODAY }));
  });

  it('sends a question to the tutor and shows the reply', async () => {
    renderAt('/skills/skill-1/lessons/w1-l2', {
      '/api/skills/skill-1/lessons/w1-l2/content': () => CONTENT,
      '/api/skills/skill-1/lessons/w1-l2/tutor': () => ({
        ...CONTENT,
        tutor: [
          { role: 'learner', text: 'How formal is quisiera?', at: '2026-11-09T10:00:00Z' },
          { role: 'tutor', text: 'It is polite and very common.', at: '2026-11-09T10:00:01Z' },
        ],
      }),
    });

    await userEvent.type(
      await screen.findByRole(
        'textbox',
        { name: 'Your question for the tutor' },
        { timeout: 5000 },
      ),
      'How formal is quisiera?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText('It is polite and very common.')).toBeInTheDocument();
  });
});
