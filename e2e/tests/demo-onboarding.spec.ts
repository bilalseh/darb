import { expect, test, type Page } from '@playwright/test';

async function next(page: Page) {
  await page.getByRole('button', { name: 'Next' }).click();
}

test('a visitor tries the demo, then starts a new skill', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { level: 3, name: 'Spanish' })).toBeVisible();

  await page.getByRole('link', { name: 'Add a skill' }).click();
  await expect(page.getByText('Step 1 of 7')).toBeVisible();

  await next(page);
  await expect(page.getByText('Enter a skill between 2 and 80 characters.')).toBeVisible();

  await page.getByRole('combobox', { name: 'What do you want to learn?' }).fill('Guitar');
  await next(page);
  await page.getByRole('radio', { name: /Hobby/ }).check();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('combobox', { name: 'What do you want to learn?' })).toHaveValue(
    'Guitar',
  );
  await next(page);
  await expect(page.getByRole('radio', { name: /Hobby/ })).toBeChecked();
  await next(page);

  await page.getByRole('radio', { name: /^Beginner/ }).check();
  await next(page);
  await page.getByLabel('Hours per week').fill('3');
  await page.getByRole('checkbox', { name: /Tuesday/ }).check();
  await page.getByRole('checkbox', { name: /Thursday/ }).check();
  await next(page);
  await page.getByRole('radio', { name: /Hands-on practice/ }).check();
  await next(page);
  await next(page);

  await expect(page.getByRole('heading', { level: 2, name: 'Check your answers' })).toBeVisible();
  await page.getByRole('button', { name: 'Create my plan' }).click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { level: 3, name: 'Guitar' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Spanish' })).toBeVisible();
});

test('the wizard keeps its answers across a page reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/onboarding');

  await page.getByRole('combobox', { name: 'What do you want to learn?' }).fill('Excel');
  await next(page);
  await page.reload();

  await expect(page.getByText('Step 2 of 7')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('combobox', { name: 'What do you want to learn?' })).toHaveValue(
    'Excel',
  );
});

test('signed-out visitors are sent to sign in and back', async ({ page }) => {
  await page.goto('/plan');

  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Darb' })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fplan$/);

  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/plan$/);
});
