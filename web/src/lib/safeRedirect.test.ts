import { describe, expect, it } from 'vitest';

import { safeRedirect } from './safeRedirect';

describe('safeRedirect', () => {
  it.each(['/plan', '/today?tab=review', '/onboarding#step'])('keeps same-site path %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/sign-in?redirect=/plan',
    '',
    undefined,
    42,
  ])('falls back to /today for %s', (value) => {
    expect(safeRedirect(value)).toBe('/today');
  });
});
