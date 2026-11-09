import { expect, test, type Page } from '@playwright/test';

async function startDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
}

test('the demo plan is in progress and a lesson can be moved', async ({ page }) => {
  await startDemo(page);
  await page.goto('/plan');

  await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
  await expect(page.getByText('Survival Spanish')).toBeVisible();
  await expect(page.getByText('3 of 3 done').first()).toBeVisible();

  const move = page.getByRole('combobox', { name: /^Move .* to$/ }).first();
  const label = await move.getAttribute('id');
  const target = await move.locator('option').nth(1).getAttribute('value');
  expect(target).toBeTruthy();
  await move.selectOption(target ?? '');

  // The move is saved by the API: it survives a reload.
  await page.reload();
  await expect(page.locator(`#${label ?? ''}`)).toHaveValue(target ?? '');
});

test('a new skill gets its own plan, and a week can be regenerated', async ({ page }) => {
  await startDemo(page);
  await page.goto('/onboarding');
  await page.getByRole('textbox', { name: 'What do you want to learn?' }).fill('Drawing');
  for (const choice of [/Hobby/, /^Beginner/]) {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: choice }).check();
  }
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Hours per week').fill('3');
  for (const day of [/Monday/, /Thursday/, /Saturday/]) {
    await page.getByRole('checkbox', { name: day }).check();
  }
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: /Hands-on practice/ }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Create my plan' }).click();

  await page.getByRole('link', { name: 'Take the placement test for Drawing' }).click();
  const result = page.getByRole('heading', {
    level: 2,
    name: /^(Beginner|Elementary|Intermediate|Advanced)$/,
  });
  for (let number = 1; number <= 12; number += 1) {
    await expect(page.getByText(`Question ${number}`, { exact: false }).or(result)).toBeVisible();
    if (await result.isVisible()) break;
    const answerBox = page.getByRole('textbox', { name: 'Your answer' });
    if (await answerBox.isVisible()) await answerBox.fill('Sketch a little every day.');
    else await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText(`Question ${number}`, { exact: false })).toBeHidden();
  }

  await page.goto('/plan');
  await page.getByRole('link', { name: 'Drawing' }).click();
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
  await expect(page.getByText('Module 1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Regenerate week 2' }).click();
  await expect(page.getByRole('button', { name: 'Regenerate week 2' })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
