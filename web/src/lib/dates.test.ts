import { describe, expect, it } from 'vitest';

import { addYearsIso, formatLocalDate, todayLocalIso } from './dates';

describe('dates', () => {
  it('formats today as a local calendar date', () => {
    expect(todayLocalIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('adds years to a calendar date', () => {
    expect(addYearsIso('2026-11-09', 5)).toBe('2031-11-09');
  });

  it('formats a calendar date without a time zone shift', () => {
    expect(formatLocalDate('2027-03-01', 'en-US')).toBe('Mar 1, 2027');
  });
});

describe('calendar arithmetic', () => {
  it('adds days across month ends', async () => {
    const { addDaysIso } = await import('./dates');
    expect(addDaysIso('2026-11-29', 3)).toBe('2026-12-02');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds the Monday of a week', async () => {
    const { mondayOfIso } = await import('./dates');
    expect(mondayOfIso('2026-11-15')).toBe('2026-11-09');
    expect(mondayOfIso('2026-11-09')).toBe('2026-11-09');
  });
});
