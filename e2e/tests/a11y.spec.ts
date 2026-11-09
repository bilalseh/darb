import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// WCAG 2.2 A and AA rules, checked on the main pages in both languages.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PAGES = ['/today', '/plan', '/review', '/progress', '/settings', '/pricing', '/onboarding'];

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  );
  expect(summary, label).toEqual([]);
}

test('the home page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
  await expectNoViolations(page, '/');
});

for (const language of ['en', 'ar'] as const) {
  test(`signed-in pages have no accessibility violations (${language})`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try the demo' }).click();
    await expect(page).toHaveURL(/\/today$/);
    if (language === 'ar') {
      await page.getByRole('button', { name: 'العربية' }).click();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    }
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Firestore keeps a connection open, so wait for loading messages to clear instead.
      await expect(page.getByText(/Loading|جارٍ تحميل/)).toHaveCount(0);
      await expectNoViolations(page, `${path} (${language})`);
    }
  });
}
