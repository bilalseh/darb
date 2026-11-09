import type { Plan } from '@darb/shared';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlanCalendar } from './PlanCalendar';
import { withLessonMoved } from './planApi';
import { Roadmap } from './Roadmap';

// These components are tested on their own, outside the app's router.
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));

const PLAN: Plan = {
  skillId: 'skill-1',
  difficulty: 0,
  generatedAt: '2026-11-02T10:00:00Z',
  modules: [{ title: 'Basics', summary: 'The very first steps.' }],
  weeks: [
    {
      index: 0,
      startDate: '2026-11-02',
      moduleIndex: 0,
      goal: 'Greet people.',
      lessons: [
        lesson('w1-l1', 'Greetings', '2026-11-02', 'done'),
        lesson('w1-l2', 'Numbers', '2026-11-04', 'done'),
      ],
    },
    {
      index: 1,
      startDate: '2026-11-09',
      moduleIndex: 0,
      goal: 'Order food.',
      lessons: [
        lesson('w2-l1', 'Café words', '2026-11-09', 'todo'),
        lesson('w2-l2', 'Ordering', '2026-11-11', 'todo'),
      ],
    },
  ],
};

function lesson(id: string, title: string, scheduledDate: string, status: 'todo' | 'done') {
  return {
    id,
    title,
    objective: 'Learn it.',
    minutes: 40,
    kind: 'learn' as const,
    scheduledDate,
    status,
  };
}

describe('PlanCalendar', () => {
  it('puts each lesson on its day', () => {
    render(<PlanCalendar plan={PLAN} today="2026-11-10" onMove={vi.fn()} />);

    const wednesday = screen.getByText(/Wed/).closest('li');
    expect(wednesday).not.toBeNull();
    expect(within(wednesday as HTMLElement).getByText('Ordering')).toBeInTheDocument();
  });

  it('moves a lesson with its date list, offering only days from today to the plan end', async () => {
    const onMove = vi.fn();
    render(<PlanCalendar plan={PLAN} today="2026-11-10" onMove={onMove} />);
    const select = screen.getByRole('combobox', { name: 'Move Ordering to' });

    const options = within(select)
      .getAllByRole('option')
      .map((o) => o.getAttribute('value'));
    expect(options[0]).toBe('2026-11-10');
    expect(options.at(-1)).toBe('2026-11-15');

    await userEvent.selectOptions(select, '2026-11-13');
    expect(onMove).toHaveBeenCalledWith('w2-l2', '2026-11-13');
  });

  it('moves a lesson by drag and drop', () => {
    const onMove = vi.fn();
    render(<PlanCalendar plan={PLAN} today="2026-11-10" onMove={onMove} />);
    const friday = screen.getByText(/Fri/).closest('li') as HTMLElement;

    const drop = createEvent.drop(friday);
    Object.defineProperty(drop, 'dataTransfer', { value: { getData: () => 'w2-l2' } });
    fireEvent(friday, drop);

    expect(onMove).toHaveBeenCalledWith('w2-l2', '2026-11-13');
  });

  it('does not offer finished lessons for moving', () => {
    render(<PlanCalendar plan={PLAN} today="2026-11-03" onMove={vi.fn()} />);

    expect(screen.queryByRole('combobox', { name: 'Move Numbers to' })).toBeNull();
  });
});

describe('Roadmap', () => {
  it('offers week changes only for current and future weeks', async () => {
    const onRegenerate = vi.fn();
    render(
      <Roadmap plan={PLAN} today="2026-11-10" pendingWeek={null} onRegenerate={onRegenerate} />,
    );

    expect(screen.queryByRole('button', { name: 'Regenerate week 1' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Make it harder' }));

    expect(onRegenerate).toHaveBeenCalledWith(1, 'harder');
    expect(screen.getByText('2 of 2 done', { exact: false })).toBeInTheDocument();
  });
});

describe('withLessonMoved', () => {
  it('changes only the moved lesson', () => {
    const moved = withLessonMoved(PLAN, 'w2-l1', '2026-11-12');

    expect(moved.weeks[1]?.lessons[0]?.scheduledDate).toBe('2026-11-12');
    expect(moved.weeks[1]?.lessons[1]).toBe(PLAN.weeks[1]?.lessons[1]);
  });
});
