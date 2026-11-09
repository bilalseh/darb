import { expect, test } from '@playwright/test';

test('a demo user sees AI usage and can delete the account and its data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByText(/0 of 20 used/)).toBeVisible();

  const remove = page.getByRole('button', { name: 'Delete my account' });
  await expect(remove).toBeDisabled();
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await remove.click();

  // Back on the home page, signed out; the protected pages need a sign-in again.
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
  await page.goto('/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Darb' })).toBeVisible();
});
