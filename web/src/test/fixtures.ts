import type { Profile, Skill } from '@darb/shared';
import { vi } from 'vitest';

import type { SessionUser } from '../lib/session';

export function profileFor(user: SessionUser): Profile {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    isDemo: user.isAnonymous,
    createdAt: '2026-10-19T12:00:00Z',
  };
}

export const SPANISH: Skill = {
  id: 'skill-1',
  status: 'onboarded',
  createdAt: '2026-10-19T12:00:00Z',
  answers: {
    skill: 'Spanish',
    reason: 'travel',
    level: 'elementary',
    hoursPerWeek: 4,
    preferredDays: ['mon', 'wed', 'sat'],
    learningStyle: 'mixed',
    targetDate: '2027-01-11',
  },
};

/** Routes fetch calls by path, like the real API under /api. */
export function stubApi(routes: Record<string, () => unknown>) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url, 'http://localhost').pathname;
    const handler = routes[path];
    return Promise.resolve(
      handler ? Response.json(handler()) : new Response(null, { status: 404 }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
