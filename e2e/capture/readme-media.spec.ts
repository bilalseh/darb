import { expect, test, type Page } from '@playwright/test';

const OUT = '../docs/media';

async function startDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page).toHaveURL(/\/today$/);
}

async function settle(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/Loading|جارٍ تحميل/)).toHaveCount(0);
  await page.waitForTimeout(600); // let charts finish drawing
}

async function shoot(page: Page, path: string, name: string) {
  await page.goto(path);
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

test('desktop screenshots in English and Arabic', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
  await page.screenshot({ path: `${OUT}/home.png` });
  await startDemo(page);
  for (const [path, name] of [
    ['/today', 'today'],
    ['/plan', 'plan'],
    ['/progress', 'progress'],
    ['/review', 'review'],
    ['/pricing', 'pricing'],
    ['/settings', 'settings'],
  ] as const) {
    await shoot(page, path, name);
  }
  await page.getByRole('button', { name: 'العربية' }).click();
  await shoot(page, '/today', 'today-ar');
  await shoot(page, '/plan', 'plan-ar');
  await shoot(page, '/progress', 'progress-ar');
});

test.describe('phone', () => {
  test('phone screenshots of Today', async ({ page }) => {
    await startDemo(page);
    await shoot(page, '/today', 'today-phone');
    await page.getByRole('button', { name: 'العربية' }).click();
    await shoot(page, '/today', 'today-phone-ar');
  });
});

test.describe('demo GIF', () => {
  test('onboarding, placement, plan and Today', async ({ page }) => {
    test.setTimeout(120_000);
    const pause = (ms = 700) => page.waitForTimeout(ms);
    await startDemo(page);
    await pause(1200);
    await page.getByRole('link', { name: 'Add a skill' }).click();
    await page
      .getByRole('textbox', { name: 'What do you want to learn?' })
      .pressSequentially('Guitar', { delay: 80 });
    await pause();
    for (const choice of [/Hobby/, /^Beginner/]) {
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('radio', { name: choice }).check();
      await pause();
    }
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Hours per week').fill('3');
    for (const day of [/Monday/, /Wednesday/, /Saturday/]) {
      await page.getByRole('checkbox', { name: day }).check();
    }
    await pause();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: /Hands-on practice/ }).check();
    await pause();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await pause(1200);
    await page.getByRole('button', { name: 'Create my plan' }).click();

    await page.getByRole('link', { name: 'Take the placement test for Guitar' }).click();
    const result = page.getByRole('heading', {
      level: 2,
      name: /^(Beginner|Elementary|Intermediate|Advanced)$/,
    });
    for (let number = 1; number <= 12; number += 1) {
      await expect(page.getByText(`Question ${number}`, { exact: false }).or(result)).toBeVisible();
      if (await result.isVisible()) break;
      const answerBox = page.getByRole('textbox', { name: 'Your answer' });
      if (await answerBox.isVisible())
        await answerBox.fill('Practice chords for ten minutes a day.');
      else await page.getByRole('radio').first().check();
      await pause(400);
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByText(`Question ${number}`, { exact: false })).toBeHidden();
    }
    await pause(1500);

    await page.goto('/plan');
    await page.getByRole('link', { name: 'Guitar' }).click();
    await page.getByRole('button', { name: 'Create my plan' }).click();
    await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
    await pause(1500);
    await page.mouse.wheel(0, 500);
    await pause(1500);
    await page.getByRole('link', { name: 'Today' }).click();
    await settle(page);
    await pause(2000);
  });
});
