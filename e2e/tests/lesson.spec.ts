import { expect, test, type Page } from '@playwright/test';

async function startDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
}

test('missed lessons are moved and explained, then studied with the tutor', async ({ page }) => {
  await startDemo(page);
  await expect(page.getByRole('heading', { name: '3-day streak' })).toBeVisible();

  // The demo left two lessons undone; opening the app moved them and says so.
  const notice = page.getByRole('status').filter({ hasText: 'We moved 2 missed lessons' });
  await expect(notice).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Catch up' })).toHaveCount(0);
  const moved = notice.getByRole('link').first();
  const title = ((await moved.textContent()) ?? '').split(':')[0] ?? '';
  await moved.click();

  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your exercise' })).toBeVisible();
  // The fake AI suggests one made-up link; only the trusted one is shown.
  await expect(page.getByRole('link', { name: 'Wikipedia overview' })).toBeVisible();
  await expect(page.getByText('Made-up link that must be dropped')).toHaveCount(0);

  await page
    .getByRole('textbox', { name: 'Your question for the tutor' })
    .fill('Where do I start?');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Good question!', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: 'Mark as done' }).click();
  await expect(page.getByRole('button', { name: 'Done ✓' })).toBeDisabled();

  await page.getByRole('link', { name: 'Back to Today' }).click();
  await expect(page.getByRole('heading', { name: '4-day streak' })).toBeVisible();
});

test('a weekly check-in adjusts next week and explains why', async ({ page }) => {
  await startDemo(page);

  await page.getByRole('link', { name: 'Start the check-in' }).click();
  await page.getByLabel('What went well this week?').fill('Ordering food felt natural.');
  await page.getByLabel('What was hard?').fill('Speaking quickly.');
  await page.getByRole('radio', { name: 'Too hard' }).check();
  await page.getByRole('button', { name: 'Adjust next week' }).click();

  await expect(page.getByRole('heading', { name: /Week \d+ was adjusted/ })).toBeVisible();
  await expect(page.getByText('shorter speaking drills', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: 'Back to Today' }).click();
  await expect(page.getByRole('link', { name: 'Start the check-in' })).toHaveCount(0);
});
