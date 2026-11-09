import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
});

test('pricing is labeled as test mode and settings show the Free plan', async ({ page }) => {
  await page.getByRole('link', { name: 'Pricing' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Plans' })).toBeVisible();
  await expect(page.getByText(/test card 4242 4242 4242 4242/)).toBeVisible();
  // The E2E API has no Stripe key, which the page explains instead of failing.
  await expect(page.getByText('Test checkout is not set up on this deployment yet.')).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  const plan = page.getByRole('region', { name: 'Plan', exact: true });
  await expect(plan.getByText('Free')).toBeVisible();
  await expect(plan.getByText('1 / 3')).toBeVisible();
});

test('reminder settings are saved and respected on Today', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Review cards are waiting' })).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Remind me when review cards are due').uncheck();
  await expect(page.getByText('Saved')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Remind me when review cards are due')).not.toBeChecked();
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review cards are waiting' })).toHaveCount(0);
});

test('the app switches to Arabic, right to left, and remembers it', async ({ page }) => {
  await page.getByRole('button', { name: 'العربية' }).click();

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1, name: 'اليوم' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'اليوم' })).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByLabel('لغة التطبيق')).toHaveValue('ar');

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
