import { expect, test } from '@playwright/test';

test('the dashboard shows progress, milestones and a self-issued summary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);

  await page.goto('/progress');
  await expect(page.getByText('9h 20m')).toBeVisible();
  const milestones = page.getByRole('region', { name: 'Milestones' });
  await expect(milestones.getByRole('listitem').filter({ hasText: 'Earned' })).toHaveCount(3);
  await expect(page.getByText('Spanish: Survival Spanish', { exact: false })).toBeVisible();
  await expect(page.getByText('7 of 24 lessons done')).toBeVisible();

  await page.getByRole('link', { name: 'Progress summary (PDF)' }).click();
  await expect(page.getByRole('heading', { name: 'Progress summary' })).toBeVisible();
  await expect(
    page.getByText('This is not an official certificate.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
});
