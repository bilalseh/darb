import { expect, test } from '@playwright/test';

test('a learner catches up on a missed lesson with the tutor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: '3-day streak' })).toBeVisible();

  const catchUp = page.getByRole('region', { name: 'Catch up' });
  const missed = catchUp.getByRole('link').first();
  const title = (await missed.locator('span span').first().textContent()) ?? '';
  await missed.click();

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
  await expect(catchUp.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
});
