import { expect, test, type Page } from '@playwright/test';

async function startDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
}

test('the demo reviews its due cards', async ({ page }) => {
  await startDemo(page);
  await page.goto('/review');

  await expect(page.getByText('Card 1 of 3')).toBeVisible();
  await page.getByRole('radio', { name: 'Estoy cansado' }).check();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Correct!')).toBeVisible();
  await page.getByRole('button', { name: 'Next card' }).click();

  await expect(page.getByText('Card 2 of 3')).toBeVisible();
  await page.getByRole('radio', { name: 'Dame un café' }).check();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Not quite.')).toBeVisible();
  await expect(page.getByText('Quisiera (I would like) is polite')).toBeVisible();
});

test('a module quiz sends missed questions to review', async ({ page }) => {
  await startDemo(page);
  await page.goto('/plan');
  await page.getByRole('link', { name: 'Take the module quiz' }).first().click();

  await expect(page.getByRole('heading', { name: 'Module quiz: Survival Spanish' })).toBeVisible();
  const groups = page.getByRole('group');
  await expect(groups).toHaveCount(5);
  for (let n = 0; n < 5; n += 1) {
    // The fake AI's correct answer is always the first option; miss the last question on purpose.
    await groups
      .nth(n)
      .getByRole('radio')
      .nth(n === 4 ? 1 : 0)
      .check();
  }
  await page.getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByText('You scored 80%')).toBeVisible();
  await expect(page.getByText('1 missed question was added to your review queue.')).toBeVisible();
});
