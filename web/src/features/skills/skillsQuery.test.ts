import { describe, expect, it, vi } from 'vitest';

import { fetchSkills } from './skillsQuery';

const { FakeTimestamp, getDocs } = vi.hoisted(() => {
  class FakeTimestamp {
    readonly iso: string;
    constructor(iso: string) {
      this.iso = iso;
    }
    toDate() {
      return new Date(this.iso);
    }
  }
  return { FakeTimestamp, getDocs: vi.fn() };
});

vi.mock('firebase/firestore', () => ({
  Timestamp: FakeTimestamp,
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  query: (path: string, order: unknown) => ({ path, order }),
  getDocs,
}));

describe('fetchSkills', () => {
  it("reads the user's skills newest first and converts timestamps", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'skill-1',
          data: () => ({
            answers: { skill: 'Spanish' },
            status: 'onboarded',
            createdAt: new FakeTimestamp('2026-10-19T12:00:00.000Z'),
          }),
        },
      ],
    });

    const skills = await fetchSkills('ada');

    expect(getDocs).toHaveBeenCalledWith({
      path: 'users/ada/skills',
      order: { field: 'createdAt', direction: 'desc' },
    });
    expect(skills).toEqual([
      {
        id: 'skill-1',
        answers: { skill: 'Spanish' },
        status: 'onboarded',
        createdAt: '2026-10-19T12:00:00.000Z',
      },
    ]);
  });
});
