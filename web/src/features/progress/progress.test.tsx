import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BadgeList } from './BadgeList';
import { formatDuration } from './progressApi';

describe('BadgeList', () => {
  it('says in words which badges are earned', () => {
    render(<BadgeList earned={['first_lesson', 'first_quiz']} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('First lesson');
    expect(items[0]).toHaveTextContent('Earned');
    expect(items[3]).toHaveTextContent('7-day streak');
    expect(items[3]).toHaveTextContent('Not yet');
  });
});

describe('formatDuration', () => {
  it('splits minutes into hours and minutes', () => {
    expect(formatDuration(560)).toEqual({ hours: 9, minutes: 20 });
    expect(formatDuration(45)).toEqual({ hours: 0, minutes: 45 });
  });
});
