import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingWizard } from './OnboardingWizard';

const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }));
const heading = (name: string) => screen.findByRole('heading', { level: 2, name });

async function answerUpToReview() {
  await userEvent.type(
    screen.getByRole('combobox', { name: 'What do you want to learn?' }),
    'Guitar',
  );
  await next();
  await userEvent.click(await screen.findByRole('radio', { name: /Hobby/ }));
  await next();
  await userEvent.click(await screen.findByRole('radio', { name: /^Beginner/ }));
  await next();
  await userEvent.type(await screen.findByLabelText('Hours per week'), '3');
  await userEvent.click(screen.getByRole('checkbox', { name: /Tuesday/ }));
  await userEvent.click(screen.getByRole('checkbox', { name: /Thursday/ }));
  expect(screen.getByText('That is about 90 minutes per study day.')).toBeInTheDocument();
  await next();
  await userEvent.click(await screen.findByRole('radio', { name: /Hands-on practice/ }));
  await next();
  await heading('Do you have a goal date?');
  await next();
  await heading('Check your answers');
}

describe('OnboardingWizard', () => {
  it('collects every answer and submits them in the API shape', async () => {
    const onComplete = vi.fn(() => Promise.resolve());
    render(<OnboardingWizard onComplete={onComplete} />);

    await answerUpToReview();
    expect(screen.getByText('Tuesday, Thursday')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create my plan' }));

    expect(onComplete).toHaveBeenCalledWith({
      skill: 'Guitar',
      reason: 'hobby',
      level: 'beginner',
      hoursPerWeek: 3,
      preferredDays: ['tue', 'thu'],
      learningStyle: 'practice',
      targetDate: null,
    });
  });

  it('blocks Next with an inline error until the step is valid', async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    const input = screen.getByRole('combobox', { name: 'What do you want to learn?' });

    await next();

    expect(await screen.findByText('Enter a skill between 2 and 80 characters.')).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
  });

  it('fills the skill from a popular choice', async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Public speaking' }));

    expect(screen.getByRole('combobox', { name: 'What do you want to learn?' })).toHaveValue(
      'Public speaking',
    );
  });

  it('keeps answers when going back and after a reload', async () => {
    const { unmount } = render(<OnboardingWizard onComplete={vi.fn()} />);
    await userEvent.type(
      screen.getByRole('combobox', { name: 'What do you want to learn?' }),
      'Excel',
    );
    await next();
    await heading('Why do you want to learn it?');

    unmount();
    render(<OnboardingWizard onComplete={vi.fn()} />);

    expect(await heading('Why do you want to learn it?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('combobox', { name: 'What do you want to learn?' })).toHaveValue(
      'Excel',
    );
  });

  it('moves focus to each new question', async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    await userEvent.type(
      screen.getByRole('combobox', { name: 'What do you want to learn?' }),
      'Piano',
    );

    await next();

    expect(await heading('Why do you want to learn it?')).toHaveFocus();
  });

  it('jumps back to a step from the review and rejects a past goal date', async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);
    await answerUpToReview();

    await userEvent.click(screen.getByRole('button', { name: 'Edit Goal date' }));
    await userEvent.type(await screen.findByLabelText('Goal date (optional)'), '2020-01-01');
    await next();

    expect(await screen.findByText(/Pick a date between today and 5 years/)).toBeVisible();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Do you have a goal date?');
  });

  it('shows an error and keeps the answers when saving fails', async () => {
    const onComplete = vi.fn(() => Promise.reject(new Error('network')));
    render(<OnboardingWizard onComplete={onComplete} />);
    await answerUpToReview();

    await userEvent.click(screen.getByRole('button', { name: 'Create my plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not save your answers.');
    expect(screen.getByText('Guitar')).toBeInTheDocument();
  });
});
