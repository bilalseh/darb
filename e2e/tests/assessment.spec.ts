import { expect, test, type Page } from '@playwright/test';

async function startDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
}

/** A score row in the result's sub-skill list (the chart's axis labels repeat the names). */
function scoreRow(page: Page, subskill: string) {
  return page.getByRole('term').filter({ hasText: subskill });
}

test('the demo shows its seeded placement result', async ({ page }) => {
  await startDemo(page);

  await page.getByRole('link', { name: 'See your Spanish placement result' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Elementary' })).toBeVisible();
  await expect(scoreRow(page, 'Speaking')).toBeVisible();
  await expect(page.getByText('36 / 100')).toBeVisible();
});

test('a learner takes the placement test for a new skill', async ({ page }) => {
  await startDemo(page);
  await page.goto('/onboarding');
  await page.getByRole('textbox', { name: 'What do you want to learn?' }).fill('Chess');
  for (const choice of [/Hobby/, /^Beginner/]) {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: choice }).check();
  }
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Hours per week').fill('2');
  await page.getByRole('checkbox', { name: /Sunday/ }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: /A mix/ }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Create my plan' }).click();

  await page.getByRole('link', { name: 'Take the placement test for Chess' }).click();
  const result = page.getByRole('heading', {
    level: 2,
    name: /^(Beginner|Elementary|Intermediate|Advanced)$/,
  });

  // The quiz length is adaptive, so answer each question until the result appears.
  for (let number = 1; number <= 12; number += 1) {
    await expect(page.getByText(`Question ${number}`, { exact: false }).or(result)).toBeVisible();
    if (await result.isVisible()) break;
    const answerBox = page.getByRole('textbox', { name: 'Your answer' });
    if (await answerBox.isVisible()) {
      await answerBox.fill('Play a few short games every week and review my mistakes.');
    } else {
      await page.getByRole('radio').first().check();
    }
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText(`Question ${number}`, { exact: false })).toBeHidden();
  }

  await expect(result).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your sub-skills' })).toBeVisible();
  await expect(scoreRow(page, 'Foundations')).toBeVisible();
});
